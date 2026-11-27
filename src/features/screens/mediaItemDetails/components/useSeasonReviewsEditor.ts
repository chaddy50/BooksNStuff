import { useState } from "react";
import type { SeasonReview } from "#/database/schema";

function emptySeasonReview(season: number): SeasonReview {
	return { season, startedAt: "", completedAt: "", rating: 0, reviewText: "" };
}

export interface SeasonReviewsEditor {
	seasonReviews: SeasonReview[];
	usedSeasons: Set<number>;
	allSeasonsAdded: boolean;
	expandedSeasons: Set<number>;
	addSeasonReview: () => void;
	toggleExpandedSeason: (season: number) => void;
	updateSeasonReview: (index: number, patch: Partial<SeasonReview>) => void;
	removeSeasonReview: (index: number) => void;
}

export function useSeasonReviewsEditor(
	initialSeasonReviews: SeasonReview[],
	totalSeasons: number | undefined,
): SeasonReviewsEditor {
	const [seasonReviews, setSeasonReviews] = useState(initialSeasonReviews);
	const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(
		new Set(),
	);

	const usedSeasons = new Set(seasonReviews.map((review) => review.season));
	const nextAvailableSeason = totalSeasons
		? Array.from({ length: totalSeasons }, (_, i) => i + 1).find(
				(season) => !usedSeasons.has(season),
			)
		: Math.max(0, ...seasonReviews.map((review) => review.season)) + 1 || 1;
	const allSeasonsAdded =
		totalSeasons !== undefined && seasonReviews.length >= totalSeasons;

	function addSeasonReview() {
		if (nextAvailableSeason === undefined) return;
		setSeasonReviews((previous) =>
			[...previous, emptySeasonReview(nextAvailableSeason)].sort(
				(a, b) => a.season - b.season,
			),
		);
		setExpandedSeasons(
			(previous) => new Set([...previous, nextAvailableSeason]),
		);
	}

	function toggleExpandedSeason(season: number) {
		setExpandedSeasons((previous) => {
			const next = new Set(previous);
			if (next.has(season)) {
				next.delete(season);
			} else {
				next.add(season);
			}
			return next;
		});
	}

	function updateSeasonReview(index: number, patch: Partial<SeasonReview>) {
		setSeasonReviews((previous) =>
			previous.map((review, i) =>
				i === index ? { ...review, ...patch } : review,
			),
		);
	}

	function removeSeasonReview(index: number) {
		setSeasonReviews((previous) => previous.filter((_, i) => i !== index));
	}

	return {
		seasonReviews,
		usedSeasons,
		allSeasonsAdded,
		expandedSeasons,
		addSeasonReview,
		toggleExpandedSeason,
		updateSeasonReview,
		removeSeasonReview,
	};
}

export function toSaveableSeasonReviews(
	seasonReviews: SeasonReview[],
): SeasonReview[] | undefined {
	return seasonReviews.length > 0 ? seasonReviews : undefined;
}
