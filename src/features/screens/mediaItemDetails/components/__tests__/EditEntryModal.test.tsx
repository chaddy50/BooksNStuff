import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { useUserSettings } from "#/components/hooks/useUserSettings";
import { EditEntryModal } from "#/features/screens/mediaItemDetails/components/EditEntryModal";
import { MediaItemType } from "#/lib/enums";

type MockedUserSettings = ReturnType<typeof useUserSettings>;

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/components/hooks/useIsMobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("#/components/hooks/useUserSettings", () => ({
	useUserSettings: vi.fn(),
}));

vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	saveInstance: vi.fn().mockResolvedValue(null),
	deleteInstance: vi.fn().mockResolvedValue(null),
}));

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

const baseInstance = {
	id: 42,
	rating: 0,
	fictionRating: null,
	seasonReviews: null,
	consumptionInfo: { method: "ebook" },
	reviewText: "",
	progressPercent: 33,
	startedAt: "2024-01-01",
	completedAt: null,
};

const baseProps = {
	open: true,
	onClose: vi.fn(),
	mediaItemId: 1,
	mediaItemType: MediaItemType.BOOK,
	statusChangedAt: null,
	instance: baseInstance,
	onSaved: vi.fn(),
	onSeriesCompletionNeeded: vi.fn(),
};

afterEach(cleanup);
beforeEach(async () => {
	toast.mockClear();
	const { useUserSettings } = await import(
		"#/components/hooks/useUserSettings"
	);
	vi.mocked(useUserSettings).mockReturnValue({
		data: undefined,
	} as unknown as MockedUserSettings);
});

describe("EditEntryModal", () => {
	it("renders dates, progress, and consumed-via for an in-progress instance", () => {
		render(<EditEntryModal {...baseProps} />);

		expect(
			screen.getByLabelText("mediaItemDetails.started"),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("mediaItemDetails.completed"),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("mediaItemDetails.progress"),
		).toBeInTheDocument();
	});

	it("renders dates, consumed-via, rating, review, and season reviews for a completed TV show instance", () => {
		render(
			<EditEntryModal
				{...baseProps}
				mediaItemType={MediaItemType.TV_SHOW}
				instance={{
					...baseInstance,
					completedAt: "2024-02-01",
					consumptionInfo: { method: "local_copy" },
				}}
			/>,
		);

		expect(
			screen.getByLabelText("mediaItemDetails.started"),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("mediaItemDetails.completed"),
		).toBeInTheDocument();
		expect(screen.getAllByTestId("rating-star").length).toBeGreaterThan(0);
		expect(
			screen.getByPlaceholderText("Write your review..."),
		).toBeInTheDocument();
		expect(
			screen.getByText("mediaItemDetails.addSeasonReview"),
		).toBeInTheDocument();
	});

	it("removes the entry and reports a series completion confirmation", async () => {
		const { deleteInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		const confirmation = { seriesId: 3, seriesName: "A Series" };
		vi.mocked(deleteInstance).mockResolvedValueOnce(confirmation);
		const onSaved = vi.fn();
		const onSeriesCompletionNeeded = vi.fn();

		render(
			<EditEntryModal
				{...baseProps}
				onSaved={onSaved}
				onSeriesCompletionNeeded={onSeriesCompletionNeeded}
			/>,
		);
		fireEvent.click(screen.getByText("mediaItemDetails.removeEntry"));

		await vi.waitFor(() =>
			expect(deleteInstance).toHaveBeenCalledWith({
				data: { instanceId: 42, today: expect.any(String) },
			}),
		);
		expect(onSaved).toHaveBeenCalled();
		expect(onSeriesCompletionNeeded).toHaveBeenCalledWith(confirmation);
	});

	it("closes the modal after removing the entry", async () => {
		const { deleteInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(deleteInstance).mockResolvedValueOnce(null);
		const onClose = vi.fn();

		render(<EditEntryModal {...baseProps} onClose={onClose} />);
		fireEvent.click(screen.getByText("mediaItemDetails.removeEntry"));

		await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
	});

	it("shows the current page number (not raw percent) for a page-tracked physical book", () => {
		render(
			<EditEntryModal
				{...baseProps}
				pageCount={146}
				instance={{
					...baseInstance,
					progressPercent: 74.6575,
					consumptionInfo: { method: "hardcover" },
				}}
			/>,
		);

		expect(screen.getByLabelText("mediaItemDetails.page")).toHaveValue(109);
	});

	it("converts a typed page number back to percent when saving a page-tracked physical book", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();

		render(
			<EditEntryModal
				{...baseProps}
				pageCount={146}
				instance={{
					...baseInstance,
					progressPercent: 74.6575,
					consumptionInfo: { method: "hardcover" },
				}}
			/>,
		);
		fireEvent.change(screen.getByLabelText("mediaItemDetails.page"), {
			target: { value: "120" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		await vi.waitFor(() =>
			expect(saveInstance).toHaveBeenCalledWith({
				data: expect.objectContaining({
					progressPercent: "82.1918",
				}),
			}),
		);
	});

	it("saves the edited dates and consumed-via on Save", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();

		render(<EditEntryModal {...baseProps} />);
		fireEvent.change(screen.getByLabelText("mediaItemDetails.started"), {
			target: { value: "2024-03-01" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		await vi.waitFor(() =>
			expect(saveInstance).toHaveBeenCalledWith({
				data: expect.objectContaining({
					mediaItemId: 1,
					instanceId: 42,
					startedAt: "2024-03-01",
				}),
			}),
		);
	});
});
