import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSeasonReviewsEditor } from "#/features/screens/mediaItemDetails/components/useSeasonReviewsEditor";

describe("useSeasonReviewsEditor", () => {
	it("adds the next available season in ascending order", () => {
		const { result, rerender } = renderHook(() =>
			useSeasonReviewsEditor([], 3),
		);

		result.current.addSeasonReview();
		rerender();
		result.current.addSeasonReview();
		rerender();

		expect(result.current.seasonReviews.map((review) => review.season)).toEqual(
			[1, 2],
		);
	});

	it("skips seasons that already have a review", () => {
		const { result, rerender } = renderHook(() =>
			useSeasonReviewsEditor(
				[
					{
						season: 1,
						startedAt: "",
						completedAt: "",
						rating: 0,
						reviewText: "",
					},
				],
				3,
			),
		);

		result.current.addSeasonReview();
		rerender();

		expect(result.current.seasonReviews.map((review) => review.season)).toEqual(
			[1, 2],
		);
	});

	it("does not add beyond totalSeasons", () => {
		const { result, rerender } = renderHook(() =>
			useSeasonReviewsEditor(
				[
					{
						season: 1,
						startedAt: "",
						completedAt: "",
						rating: 0,
						reviewText: "",
					},
				],
				1,
			),
		);

		expect(result.current.allSeasonsAdded).toBe(true);

		result.current.addSeasonReview();
		rerender();

		expect(result.current.seasonReviews).toHaveLength(1);
	});

	it("removes a season review by index", () => {
		const { result, rerender } = renderHook(() =>
			useSeasonReviewsEditor(
				[
					{
						season: 1,
						startedAt: "",
						completedAt: "",
						rating: 0,
						reviewText: "",
					},
					{
						season: 2,
						startedAt: "",
						completedAt: "",
						rating: 0,
						reviewText: "",
					},
				],
				undefined,
			),
		);

		result.current.removeSeasonReview(0);
		rerender();

		expect(result.current.seasonReviews.map((review) => review.season)).toEqual(
			[2],
		);
	});

	it("updates a season review by index", () => {
		const { result, rerender } = renderHook(() =>
			useSeasonReviewsEditor(
				[
					{
						season: 1,
						startedAt: "",
						completedAt: "",
						rating: 0,
						reviewText: "",
					},
				],
				undefined,
			),
		);

		result.current.updateSeasonReview(0, { rating: 4.5 });
		rerender();

		expect(result.current.seasonReviews[0]?.rating).toBe(4.5);
	});

	it("toggles a season's expanded state", () => {
		const { result, rerender } = renderHook(() =>
			useSeasonReviewsEditor(
				[
					{
						season: 1,
						startedAt: "",
						completedAt: "",
						rating: 0,
						reviewText: "",
					},
				],
				undefined,
			),
		);

		result.current.toggleExpandedSeason(1);
		rerender();
		expect(result.current.expandedSeasons.has(1)).toBe(true);

		result.current.toggleExpandedSeason(1);
		rerender();
		expect(result.current.expandedSeasons.has(1)).toBe(false);
	});
});
