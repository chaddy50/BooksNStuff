import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewAndCompleteModal } from "#/features/screens/mediaItemDetails/components/header/components/ReviewAndCompleteModal";
import { MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/components/hooks/useIsMobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	saveInstance: vi.fn().mockResolvedValue(null),
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
	consumptionInfo: null,
	reviewText: "",
	progressPercent: 33,
	startedAt: "2024-01-01",
	completedAt: null,
};

function clickStarHalf(starNumber: number, half: "left" | "right") {
	const stars = screen.getAllByTestId("rating-star");
	const star = stars[starNumber - 1].querySelector("svg") as SVGSVGElement;
	const left = 100;
	const width = 20;
	star.getBoundingClientRect = () => ({ left, width }) as unknown as DOMRect;

	fireEvent.click(star, {
		clientX: half === "left" ? left + width / 4 : left + (width * 3) / 4,
	});
}

const baseProps = {
	open: true,
	onClose: vi.fn(),
	mediaItemId: 1,
	instance: baseInstance,
	onSaved: vi.fn(),
	onSeriesCompletionNeeded: vi.fn(),
};

afterEach(cleanup);

describe("ReviewAndCompleteModal", () => {
	it("saves the rating, review, and season review, marking the instance complete as of today", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();

		render(
			<ReviewAndCompleteModal
				{...baseProps}
				mediaItemType={MediaItemType.TV_SHOW}
				totalSeasons={2}
			/>,
		);

		clickStarHalf(4, "right");
		fireEvent.change(screen.getByPlaceholderText("Write your review..."), {
			target: { value: "Loved it" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.addSeasonReview"));

		fireEvent.click(screen.getByText("mediaItemDetails.markComplete"));

		expect(saveInstance).toHaveBeenCalledWith({
			data: expect.objectContaining({
				mediaItemId: 1,
				instanceId: 42,
				rating: "4.0",
				reviewText: "Loved it",
				completedAt: expect.any(String),
				seasonReviews: expect.arrayContaining([
					expect.objectContaining({ season: 1 }),
				]),
			}),
		});
	});

	it("does not render season-review UI for a non-TV-show item", () => {
		render(
			<ReviewAndCompleteModal
				{...baseProps}
				mediaItemType={MediaItemType.BOOK}
			/>,
		);

		expect(
			screen.queryByText("mediaItemDetails.addSeasonReview"),
		).not.toBeInTheDocument();
	});

	it("calls onSaved with the series completion confirmation when saveInstance returns one", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		const confirmation = { seriesId: 7, seriesName: "A Trilogy" };
		vi.mocked(saveInstance).mockResolvedValueOnce(confirmation);
		const onSaved = vi.fn();

		render(
			<ReviewAndCompleteModal
				{...baseProps}
				mediaItemType={MediaItemType.BOOK}
				onSaved={onSaved}
			/>,
		);

		fireEvent.click(screen.getByText("mediaItemDetails.markComplete"));

		await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith(confirmation));
	});

	it("closes without saving when Cancel is clicked", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		const onClose = vi.fn();

		render(
			<ReviewAndCompleteModal
				{...baseProps}
				mediaItemType={MediaItemType.BOOK}
				onClose={onClose}
			/>,
		);

		fireEvent.click(screen.getByText("mediaItemDetails.cancel"));

		expect(saveInstance).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it("has no close (X) button, relying on Cancel instead", () => {
		render(
			<ReviewAndCompleteModal
				{...baseProps}
				mediaItemType={MediaItemType.BOOK}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: /close/i }),
		).not.toBeInTheDocument();
	});
});
