import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatusSelect } from "#/features/screens/mediaItemDetails/components/metadata/components/StatusSelect";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const invalidate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate }),
}));

vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	updateMediaItemStatus: vi.fn().mockResolvedValue(null),
}));

const baseMediaItemDetails = {
	id: 1,
	status: MediaItemStatus.IN_PROGRESS,
} as unknown as MediaItemDetails;

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("StatusSelect", () => {
	it("calls onSeriesCompletionNeeded when updateMediaItemStatus returns a confirmation", async () => {
		const { updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		const confirmation = { seriesId: 7, seriesName: "Ongoing Trilogy" };
		vi.mocked(updateMediaItemStatus).mockResolvedValueOnce(confirmation);
		const onSeriesCompletionNeeded = vi.fn();

		render(
			<StatusSelect
				mediaItemDetails={baseMediaItemDetails}
				onSeriesCompletionNeeded={onSeriesCompletionNeeded}
			/>,
		);

		fireEvent.click(screen.getByRole("combobox"));
		fireEvent.click(screen.getByText("status.done"));

		await vi.waitFor(() => {
			expect(onSeriesCompletionNeeded).toHaveBeenCalledWith(confirmation);
		});
		expect(invalidate).toHaveBeenCalled();
	});

	it("does not call onSeriesCompletionNeeded when updateMediaItemStatus returns null", async () => {
		const { updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(updateMediaItemStatus).mockResolvedValueOnce(null);
		const onSeriesCompletionNeeded = vi.fn();

		render(
			<StatusSelect
				mediaItemDetails={baseMediaItemDetails}
				onSeriesCompletionNeeded={onSeriesCompletionNeeded}
			/>,
		);

		fireEvent.click(screen.getByRole("combobox"));
		fireEvent.click(screen.getByText("status.done"));

		await vi.waitFor(() => {
			expect(invalidate).toHaveBeenCalled();
		});
		expect(onSeriesCompletionNeeded).not.toHaveBeenCalled();
	});

	it("sends the caller's local date instead of letting the server compute its own", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2024-05-15T12:00:00"));
		try {
			const { updateMediaItemStatus } = await import(
				"#/features/screens/mediaItemDetails/mediaItemDetails"
			);

			render(
				<StatusSelect
					mediaItemDetails={baseMediaItemDetails}
					onSeriesCompletionNeeded={vi.fn()}
				/>,
			);

			fireEvent.click(screen.getByRole("combobox"));
			fireEvent.click(screen.getByText("status.done"));

			await vi.waitFor(() => expect(updateMediaItemStatus).toHaveBeenCalled());
			expect(vi.mocked(updateMediaItemStatus).mock.calls[0][0].data.today).toBe(
				"2024-05-15",
			);
		} finally {
			vi.useRealTimers();
		}
	});
});
