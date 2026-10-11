import { describe, expect, it } from "vitest";
import {
	getLogProgressLabelKey,
	getMostRecentRating,
	getUnfinishedInstance,
} from "#/features/screens/mediaItemDetails/mediaItemDetailsHeader";
import { MediaItemType } from "#/lib/enums";

type Instance = {
	id: number;
	rating: number;
	fictionRating: null;
	seasonReviews: null;
	consumptionInfo: null;
	reviewText: string | null;
	startedAt: string | null;
	completedAt: string | null;
};

function makeInstance(overrides: Partial<Instance>): Instance {
	return {
		id: 1,
		rating: 0,
		fictionRating: null,
		seasonReviews: null,
		consumptionInfo: null,
		reviewText: null,
		startedAt: null,
		completedAt: null,
		...overrides,
	};
}

describe("getMostRecentRating", () => {
	it("returns the rating of the newest instance that has one", () => {
		const instances = [
			makeInstance({ id: 3, rating: 0 }),
			makeInstance({ id: 2, rating: 4 }),
			makeInstance({ id: 1, rating: 2 }),
		];

		expect(getMostRecentRating(instances)).toBe(4);
	});

	it("returns 0 when no instance has a rating", () => {
		const instances = [
			makeInstance({ id: 2, rating: 0 }),
			makeInstance({ id: 1, rating: 0 }),
		];

		expect(getMostRecentRating(instances)).toBe(0);
	});

	it("returns 0 for an empty instance list", () => {
		expect(getMostRecentRating([])).toBe(0);
	});
});

describe("getUnfinishedInstance", () => {
	it("returns the instance that has started but not completed", () => {
		const unfinished = makeInstance({ id: 5, startedAt: "2026-01-01" });
		const instances = [
			makeInstance({
				id: 6,
				startedAt: "2025-01-01",
				completedAt: "2025-02-01",
			}),
			unfinished,
		];

		expect(getUnfinishedInstance(instances)).toBe(unfinished);
	});

	it("returns undefined when every instance is completed or not started", () => {
		const instances = [
			makeInstance({
				id: 2,
				startedAt: "2025-01-01",
				completedAt: "2025-02-01",
			}),
			makeInstance({ id: 1 }),
		];

		expect(getUnfinishedInstance(instances)).toBeUndefined();
	});
});

describe("getLogProgressLabelKey", () => {
	it("returns Update Progress when there is an unfinished instance, regardless of type", () => {
		expect(getLogProgressLabelKey(MediaItemType.BOOK, true)).toBe(
			"mediaItemDetails.updateProgress",
		);
		expect(getLogProgressLabelKey(MediaItemType.MOVIE, true)).toBe(
			"mediaItemDetails.updateProgress",
		);
	});

	it("returns the reading label for books with no unfinished instance", () => {
		expect(getLogProgressLabelKey(MediaItemType.BOOK, false)).toBe(
			"mediaItemDetails.startReading",
		);
	});

	it("returns the watching label for movies and tv shows with no unfinished instance", () => {
		expect(getLogProgressLabelKey(MediaItemType.MOVIE, false)).toBe(
			"mediaItemDetails.startWatching",
		);
		expect(getLogProgressLabelKey(MediaItemType.TV_SHOW, false)).toBe(
			"mediaItemDetails.startWatching",
		);
	});

	it("returns the listening label for podcasts with no unfinished instance", () => {
		expect(getLogProgressLabelKey(MediaItemType.PODCAST, false)).toBe(
			"mediaItemDetails.startListening",
		);
	});

	it("returns the playing label for video games with no unfinished instance", () => {
		expect(getLogProgressLabelKey(MediaItemType.VIDEO_GAME, false)).toBe(
			"mediaItemDetails.startPlaying",
		);
	});
});
