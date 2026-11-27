import { describe, expect, it } from "vitest";
import {
	getLastConsumedLabelKey,
	getLogProgressLabelKey,
	getMostRecentCompletedDate,
	getMostRecentRating,
	getPageCount,
	getQueueCaptionLabels,
	getRereadLabelKey,
	getTotalSeasons,
	getUnfinishedInstance,
} from "#/features/screens/mediaItemDetails/mediaItemDetailsHeader";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";

const t = (key: string, options?: Record<string, unknown>) =>
	options ? `${key}:${JSON.stringify(options)}` : key;

type Instance = {
	id: number;
	rating: number;
	fictionRating: null;
	seasonReviews: null;
	consumptionInfo: null;
	reviewText: string | null;
	progressPercent: number | null;
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
		progressPercent: null,
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
	it("returns the reading label for books", () => {
		expect(getLogProgressLabelKey(MediaItemType.BOOK)).toBe(
			"mediaItemDetails.startReading",
		);
	});

	it("returns the watching label for movies and tv shows", () => {
		expect(getLogProgressLabelKey(MediaItemType.MOVIE)).toBe(
			"mediaItemDetails.startWatching",
		);
		expect(getLogProgressLabelKey(MediaItemType.TV_SHOW)).toBe(
			"mediaItemDetails.startWatching",
		);
	});

	it("returns the listening label for podcasts", () => {
		expect(getLogProgressLabelKey(MediaItemType.PODCAST)).toBe(
			"mediaItemDetails.startListening",
		);
	});

	it("returns the playing label for video games", () => {
		expect(getLogProgressLabelKey(MediaItemType.VIDEO_GAME)).toBe(
			"mediaItemDetails.startPlaying",
		);
	});
});

describe("getRereadLabelKey", () => {
	it("returns the reread label for books", () => {
		expect(getRereadLabelKey(MediaItemType.BOOK)).toBe(
			"mediaItemDetails.reread",
		);
	});

	it("returns the rewatch label for movies and tv shows", () => {
		expect(getRereadLabelKey(MediaItemType.MOVIE)).toBe(
			"mediaItemDetails.rewatch",
		);
		expect(getRereadLabelKey(MediaItemType.TV_SHOW)).toBe(
			"mediaItemDetails.rewatch",
		);
	});

	it("returns the relisten label for podcasts", () => {
		expect(getRereadLabelKey(MediaItemType.PODCAST)).toBe(
			"mediaItemDetails.relisten",
		);
	});

	it("returns the replay label for video games", () => {
		expect(getRereadLabelKey(MediaItemType.VIDEO_GAME)).toBe(
			"mediaItemDetails.replay",
		);
	});
});

describe("getLastConsumedLabelKey", () => {
	it("returns the last-read label for books", () => {
		expect(getLastConsumedLabelKey(MediaItemType.BOOK)).toBe(
			"mediaItemDetails.lastRead",
		);
	});

	it("returns the last-watched label for movies and tv shows", () => {
		expect(getLastConsumedLabelKey(MediaItemType.MOVIE)).toBe(
			"mediaItemDetails.lastWatched",
		);
		expect(getLastConsumedLabelKey(MediaItemType.TV_SHOW)).toBe(
			"mediaItemDetails.lastWatched",
		);
	});

	it("returns the last-listened label for podcasts", () => {
		expect(getLastConsumedLabelKey(MediaItemType.PODCAST)).toBe(
			"mediaItemDetails.lastListened",
		);
	});

	it("returns the last-played label for video games", () => {
		expect(getLastConsumedLabelKey(MediaItemType.VIDEO_GAME)).toBe(
			"mediaItemDetails.lastPlayed",
		);
	});
});

describe("getMostRecentCompletedDate", () => {
	it("returns the completedAt of the newest completed instance", () => {
		const instances = [
			makeInstance({ id: 3, completedAt: "2026-03-01" }),
			makeInstance({ id: 2, completedAt: "2026-02-01" }),
			makeInstance({ id: 1, completedAt: "2026-01-01" }),
		];

		expect(getMostRecentCompletedDate(instances)).toBe("2026-03-01");
	});

	it("skips instances with no completedAt to find the newest completed one", () => {
		const instances = [
			makeInstance({ id: 2, completedAt: null }),
			makeInstance({ id: 1, completedAt: "2026-01-01" }),
		];

		expect(getMostRecentCompletedDate(instances)).toBe("2026-01-01");
	});

	it("returns undefined when no instance has a completedAt", () => {
		const instances = [makeInstance({ id: 1, completedAt: null })];

		expect(getMostRecentCompletedDate(instances)).toBeUndefined();
	});
});

describe("getQueueCaptionLabels", () => {
	it("returns no caption for backlog", () => {
		expect(
			getQueueCaptionLabels(MediaItemStatus.BACKLOG, MediaItemType.BOOK, [], t),
		).toEqual([]);
	});

	it("returns no caption for next-up and waiting-for-next-release, since the status heading covers it", () => {
		expect(
			getQueueCaptionLabels(MediaItemStatus.NEXT_UP, MediaItemType.BOOK, [], t),
		).toEqual([]);
		expect(
			getQueueCaptionLabels(
				MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
				MediaItemType.BOOK,
				[],
				t,
			),
		).toEqual([]);
	});

	it("returns a type-specific last-consumed label with the most recent completed date, for done items", () => {
		const instances = [
			makeInstance({ id: 2, completedAt: "2026-03-01" }),
			makeInstance({ id: 1, completedAt: "2026-01-01" }),
		];

		expect(
			getQueueCaptionLabels(
				MediaItemStatus.COMPLETED,
				MediaItemType.MOVIE,
				instances,
				t,
			),
		).toEqual(['mediaItemDetails.lastWatched:{"date":"Mar 01, 2026"}']);
	});

	it("returns no caption for done items with no completed instance", () => {
		expect(
			getQueueCaptionLabels(
				MediaItemStatus.COMPLETED,
				MediaItemType.BOOK,
				[],
				t,
			),
		).toEqual([]);
	});
});

describe("getTotalSeasons", () => {
	it("returns the season count for a TV show", () => {
		expect(getTotalSeasons(MediaItemType.TV_SHOW, { seasons: 4 })).toBe(4);
	});

	it("returns undefined for a non-TV-show type even with a seasons field", () => {
		expect(
			getTotalSeasons(MediaItemType.MOVIE, { seasons: 4 }),
		).toBeUndefined();
	});
});

describe("getPageCount", () => {
	it("returns the page count for a book", () => {
		expect(getPageCount(MediaItemType.BOOK, { pageCount: 320 })).toBe(320);
	});

	it("returns undefined for a non-book type even with a pageCount field", () => {
		expect(
			getPageCount(MediaItemType.MOVIE, { pageCount: 320 }),
		).toBeUndefined();
	});
});
