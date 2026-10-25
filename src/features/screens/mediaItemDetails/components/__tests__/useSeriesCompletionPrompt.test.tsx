import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSeriesCompletionPrompt } from "#/features/screens/mediaItemDetails/components/useSeriesCompletionPrompt";
import { MediaItemStatus } from "#/lib/enums";

const invalidate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate }),
}));

vi.mock("#/features/screens/seriesDetails/seriesDetails", () => ({
	updateSeriesStatus: vi.fn().mockResolvedValue(undefined),
	confirmSeriesCompletion: vi.fn().mockResolvedValue(undefined),
}));

const CONFIRMATION = { seriesId: 7, seriesName: "Ongoing Trilogy" };

describe("useSeriesCompletionPrompt", () => {
	it("starts with no pending confirmation", () => {
		const { result } = renderHook(() => useSeriesCompletionPrompt());

		expect(result.current.pendingConfirmation).toBeNull();
		expect(result.current.isResolving).toBe(false);
	});

	it("marking waiting calls updateSeriesStatus with WAITING_FOR_NEXT_RELEASE and clears the pending confirmation", async () => {
		const { updateSeriesStatus } = await import(
			"#/features/screens/seriesDetails/seriesDetails"
		);
		const { result } = renderHook(() => useSeriesCompletionPrompt());

		act(() => result.current.promptSeriesCompletion(CONFIRMATION));
		expect(result.current.pendingConfirmation).toEqual(CONFIRMATION);

		await act(() => result.current.markWaiting());

		expect(updateSeriesStatus).toHaveBeenCalledWith({
			data: {
				seriesId: CONFIRMATION.seriesId,
				status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
			},
		});
		expect(invalidate).toHaveBeenCalled();
		expect(result.current.pendingConfirmation).toBeNull();
	});

	it("marking complete calls confirmSeriesCompletion for the pending series", async () => {
		const { confirmSeriesCompletion } = await import(
			"#/features/screens/seriesDetails/seriesDetails"
		);
		const { result } = renderHook(() => useSeriesCompletionPrompt());

		act(() => result.current.promptSeriesCompletion(CONFIRMATION));
		await act(() => result.current.markComplete());

		expect(confirmSeriesCompletion).toHaveBeenCalledWith({
			data: { seriesId: CONFIRMATION.seriesId },
		});
		expect(result.current.pendingConfirmation).toBeNull();
	});

	it("does nothing when resolving with no pending confirmation", async () => {
		const { updateSeriesStatus } = await import(
			"#/features/screens/seriesDetails/seriesDetails"
		);
		vi.mocked(updateSeriesStatus).mockClear();
		const { result } = renderHook(() => useSeriesCompletionPrompt());

		await act(() => result.current.markWaiting());

		expect(updateSeriesStatus).not.toHaveBeenCalled();
	});
});
