import { describe, expect, it } from "vitest";

import {
	MediaItemStatus,
	MediaItemType,
	NextItemStatus,
	PurchaseStatus,
} from "#/lib/enums";
import { BACKUP_VERSION, backupSchema } from "../backup.server";

/**
 * Parse-level tests only — no database. These cover the half of the data-loss
 * bug that lived in the Zod schemas: undeclared columns were silently stripped
 * on the way in, even though the file on disk carried them.
 */

const TIMESTAMP = "2026-01-01T00:00:00.000Z";

const SEASON_REVIEWS = [
	{
		season: 1,
		startedAt: "2024-01-01",
		completedAt: "2024-02-01",
		rating: 9,
		reviewText: "Strong opening season",
	},
];

const CONSUMPTION_INFO = { method: "streaming" };

/** A v1 file, matching the pre-collapse export shape exactly. */
function buildV1Backup() {
	return {
		version: 1,
		exportedAt: TIMESTAMP,
		series: [],
		mediaItemMetadata: [
			{
				id: 500,
				type: MediaItemType.MOVIE,
				title: "Dune",
				description: "Legacy description",
				coverImageUrl: "http://example.test/legacy.jpg",
				releaseDate: "2021-10-22",
				externalId: "tmdb-438631",
				externalSource: "tmdb",
				metadata: { director: "Denis Villeneuve" },
				createdAt: TIMESTAMP,
			},
		],
		mediaItems: [
			{
				id: 900,
				mediaItemMetadataId: 500,
				seriesId: null,
				status: MediaItemStatus.COMPLETED,
				purchaseStatus: PurchaseStatus.PURCHASED,
				createdAt: TIMESTAMP,
				updatedAt: TIMESTAMP,
			},
		],
		mediaItemInstances: [],
		views: [],
	};
}

/**
 * A realistic v2 file. v2 exported with an unprojected SELECT, so the file
 * carries columns the v2 import schema had no declaration for — that is exactly
 * what the widened schemas have to give back.
 */
function buildV2Backup() {
	return {
		version: 2,
		exportedAt: TIMESTAMP,
		series: [
			{
				id: 300,
				name: "Trilogy",
				type: MediaItemType.MOVIE,
				status: MediaItemStatus.IN_PROGRESS,
				rating: "8.0",
				description: null,
				isComplete: false,
				nextItemStatus: NextItemStatus.PURCHASED,
				createdAt: TIMESTAMP,
				updatedAt: TIMESTAMP,
			},
		],
		mediaItems: [
			{
				id: 900,
				seriesId: 300,
				creatorId: 7,
				genreId: 3,
				type: MediaItemType.MOVIE,
				title: "Dune",
				description: null,
				coverImageUrl: null,
				releaseDate: "2021-10-22",
				externalId: "tmdb-438631",
				externalSource: "tmdb",
				metadata: { director: "Denis Villeneuve" },
				status: MediaItemStatus.COMPLETED,
				purchaseStatus: PurchaseStatus.PURCHASED,
				expectedReleaseDate: "2027-03-01",
				createdAt: TIMESTAMP,
				updatedAt: TIMESTAMP,
			},
		],
		mediaItemInstances: [
			{
				id: 800,
				mediaItemId: 900,
				rating: "9.0",
				fictionRating: null,
				seasonReviews: SEASON_REVIEWS,
				consumptionInfo: CONSUMPTION_INFO,
				reviewText: "Great",
				startedAt: "2021-11-01",
				completedAt: "2021-11-02",
				createdAt: TIMESTAMP,
				updatedAt: TIMESTAMP,
			},
		],
		views: [],
	};
}

/** A current-format file with one row in every collection. */
function buildV3Backup() {
	return {
		...buildV2Backup(),
		version: 3,
		tags: [{ id: 10, name: "Favorites", createdAt: TIMESTAMP }],
		mediaItemTags: [{ mediaItemId: 900, tagId: 10 }],
		creators: [
			{
				id: 7,
				name: "Denis Villeneuve",
				biography: "Canadian filmmaker",
				createdAt: TIMESTAMP,
				updatedAt: TIMESTAMP,
			},
		],
		genres: [{ id: 3, name: "Science Fiction", createdAt: TIMESTAMP }],
		customReports: [
			{
				id: 20,
				name: "Movies this year",
				reportType: "items_completed_by_month",
				mediaTypes: [MediaItemType.MOVIE],
				monthCount: 12,
				displayOrder: 0,
				createdAt: TIMESTAMP,
				updatedAt: TIMESTAMP,
			},
		],
		userSettings: {
			activeCustomReportId: 20,
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "asc",
			defaultSeriesSortBy: "name",
			defaultSeriesSortDirection: "desc",
			defaultBookConsumptionMethod: "ebook",
			defaultMovieConsumptionMethod: "streaming",
			defaultTvShowConsumptionMethod: "streaming",
			defaultGamePlatform: "pc",
			defaultGameControlMethod: "controller",
			createdAt: TIMESTAMP,
			updatedAt: TIMESTAMP,
		},
	};
}

/** A v4 file — the v3 shape plus the hand-built view orders. */
function buildV4Backup() {
	return {
		...buildV3Backup(),
		version: 4,
		viewItemOrder: [{ viewId: 1, mediaItemId: 1, position: 0 }],
	};
}

/** A v5 file — the v4 shape minus custom reports and their settings link. */
function buildV5Backup() {
	const v4 = buildV4Backup();
	const { customReports: _customReports, ...rest } = v4;
	const { activeCustomReportId: _activeCustomReportId, ...userSettings } =
		v4.userSettings;
	return { ...rest, version: 5 as const, userSettings };
}

describe("BACKUP_VERSION", () => {
	it("is 5", () => {
		expect(BACKUP_VERSION).toBe(5);
	});
});

describe("backupSchema version acceptance", () => {
	it("accepts a v3 document with every collection", () => {
		expect(backupSchema.safeParse(buildV3Backup()).success).toBe(true);
	});

	it("still accepts a v2 document", () => {
		expect(backupSchema.safeParse(buildV2Backup()).success).toBe(true);
	});

	it("still accepts a v1 document", () => {
		expect(backupSchema.safeParse(buildV1Backup()).success).toBe(true);
	});

	it("still accepts a v4 document", () => {
		expect(backupSchema.safeParse(buildV4Backup()).success).toBe(true);
	});

	it("rejects an unrecognized version", () => {
		expect(
			backupSchema.safeParse({ ...buildV5Backup(), version: 6 }).success,
		).toBe(false);
	});

	it("accepts a v5 document with every collection", () => {
		expect(backupSchema.safeParse(buildV5Backup()).success).toBe(true);
	});

	it("accepts a v5 document with no saved view order", () => {
		expect(
			backupSchema.safeParse({ ...buildV5Backup(), viewItemOrder: [] }).success,
		).toBe(true);
	});

	it("rejects a v5 document missing viewItemOrder", () => {
		const { viewItemOrder: _omitted, ...withoutOrder } = buildV5Backup();

		expect(backupSchema.safeParse(withoutOrder).success).toBe(false);
	});
});

describe("backupSchema viewItemOrder entries", () => {
	it("accepts position 0", () => {
		const backup = buildV5Backup();
		backup.viewItemOrder = [{ viewId: 1, mediaItemId: 1, position: 0 }];

		expect(backupSchema.safeParse(backup).success).toBe(true);
	});

	it("rejects a non-integer position", () => {
		const backup = buildV5Backup();
		backup.viewItemOrder = [
			{ viewId: 1, mediaItemId: 1, position: "first" } as never,
		];

		expect(backupSchema.safeParse(backup).success).toBe(false);
	});

	it("rejects an entry missing its view id", () => {
		const backup = buildV5Backup();
		backup.viewItemOrder = [{ mediaItemId: 1, position: 0 } as never];

		expect(backupSchema.safeParse(backup).success).toBe(false);
	});
});

describe("backupSchema no longer strips columns from v2 files", () => {
	it("retains creatorId, genreId and expectedReleaseDate on media items", () => {
		const parsed = backupSchema.parse(buildV2Backup());

		expect(parsed.mediaItems[0]).toMatchObject({
			creatorId: 7,
			genreId: 3,
			expectedReleaseDate: "2027-03-01",
		});
	});

	it("retains nextItemStatus on series", () => {
		const parsed = backupSchema.parse(buildV2Backup());

		expect(parsed.series[0].nextItemStatus).toBe(NextItemStatus.PURCHASED);
	});

	it("retains seasonReviews and consumptionInfo on instances", () => {
		const parsed = backupSchema.parse(buildV2Backup());

		expect(parsed.mediaItemInstances[0].seasonReviews).toEqual(SEASON_REVIEWS);
		expect(parsed.mediaItemInstances[0].consumptionInfo).toEqual(
			CONSUMPTION_INFO,
		);
	});
});

describe("backupSchema optional and required fields", () => {
	it("accepts a v2 document that omits the newly-optional columns", () => {
		const backup = buildV2Backup();
		const {
			creatorId: _creatorId,
			genreId: _genreId,
			expectedReleaseDate: _expectedReleaseDate,
			...itemWithoutNewColumns
		} = backup.mediaItems[0];
		const { nextItemStatus: _nextItemStatus, ...seriesWithoutNewColumns } =
			backup.series[0];
		const {
			seasonReviews: _seasonReviews,
			consumptionInfo: _consumptionInfo,
			...instanceWithoutNewColumns
		} = backup.mediaItemInstances[0];

		const parsed = backupSchema.safeParse({
			...backup,
			series: [seriesWithoutNewColumns],
			mediaItems: [itemWithoutNewColumns],
			mediaItemInstances: [instanceWithoutNewColumns],
		});

		expect(parsed.success).toBe(true);
	});

	it("rejects a v3 document missing the tags array", () => {
		const { tags: _tags, ...backupWithoutTags } = buildV3Backup();

		expect(backupSchema.safeParse(backupWithoutTags).success).toBe(false);
	});

	it("accepts a v3 document with null userSettings", () => {
		expect(
			backupSchema.safeParse({ ...buildV3Backup(), userSettings: null })
				.success,
		).toBe(true);
	});
});
