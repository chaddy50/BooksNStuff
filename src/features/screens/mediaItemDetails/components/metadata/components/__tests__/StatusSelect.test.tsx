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
});
