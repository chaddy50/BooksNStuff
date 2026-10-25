import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { asc, eq } from "drizzle-orm";
import {
	creators,
	genres,
	mediaItems,
	mediaItemTags,
	series,
	tags,
	userSettings,
	viewItemOrder,
	views,
} from "#/database/schema";
import {
	MediaItemStatus,
	MediaItemType,
	NextItemStatus,
	PurchaseStatus,
} from "#/lib/enums";
import { runItemQuery } from "#/lib/queries/itemQuery.server";
import { testDb } from "#/tests/integration/db";
import {
	insertCreator,
	insertGenre,
	insertInstance,
	insertMediaItem,
	insertSeries,
	insertTag,
	insertUser,
	insertUserSettings,
	insertView,
	insertViewItemOrder,
	linkTag,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	type BackupData,
	backupSchema,
	exportBackup,
	importBackup,
} from "../backup.server";

/** Serializes an export the way writing it to disk and reading it back would. */
async function exportThroughJson(userId: string) {
	const exported = await exportBackup(userId);
	return backupSchema.parse(JSON.parse(JSON.stringify(exported)));
}

const USER_A = "user-a";
const USER_B = "user-b";

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

beforeEach(() => truncateAll());

/** A version-1 file, matching the pre-collapse export shape exactly. */
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
			{
				id: 501,
				type: MediaItemType.BOOK,
				title: "Unreferenced",
				description: null,
				coverImageUrl: null,
				releaseDate: null,
				externalId: "hc-orphan",
				externalSource: "hardcover",
				metadata: {},
				createdAt: TIMESTAMP,
			},
		],
		mediaItems: [
			{
				id: 900,
				mediaItemMetadataId: 500,
				seriesId: null,
				creatorId: 7,
				genreId: 3,
				status: MediaItemStatus.COMPLETED,
				purchaseStatus: PurchaseStatus.PURCHASED,
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
				reviewText: "Legacy review",
				startedAt: "2021-11-01",
				completedAt: "2021-11-02",
				createdAt: TIMESTAMP,
				updatedAt: TIMESTAMP,
			},
		],
		views: [],
	};
}

/**
 * A realistic version-2 file. v2 exported with an unprojected SELECT, so the
 * file carries columns the v2 import schema used to discard.
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

/** A current-format file with every collection empty. */
function buildEmptyV3Backup(): BackupData {
	return {
		version: 3,
		exportedAt: TIMESTAMP,
		series: [],
		mediaItems: [],
		mediaItemInstances: [],
		views: [],
		tags: [],
		mediaItemTags: [],
		creators: [],
		genres: [],
		customReports: [],
		userSettings: null,
	};
}

/**
 * Seeds exactly one row in every user-owned table, with all foreign keys
 * populated, so a round trip has something of each kind to lose.
 */
async function seedFullLibrary(userId: string) {
	await insertUser(userId);

	const seriesId = await insertSeries({
		userId,
		name: "Trilogy",
		type: MediaItemType.MOVIE,
		status: MediaItemStatus.IN_PROGRESS,
		nextItemStatus: NextItemStatus.PURCHASED,
		rating: "8.0",
		description: "A series description",
		isComplete: false,
	});
	const creatorId = await insertCreator({ userId, name: "Denis Villeneuve" });
	const genreId = await insertGenre({ userId, name: "Science Fiction" });
	const tagId = await insertTag({ userId, name: "Favorites" });

	const mediaItemId = await insertMediaItem({
		userId,
		type: MediaItemType.MOVIE,
		title: "Dune",
		description: "A description",
		coverImageUrl: "http://example.test/a.jpg",
		releaseDate: "2021-10-22",
		externalId: "tmdb-438631",
		externalSource: "tmdb",
		metadata: { director: "Denis Villeneuve", runtime: 155 },
		status: MediaItemStatus.COMPLETED,
		purchaseStatus: PurchaseStatus.PURCHASED,
		expectedReleaseDate: "2027-03-01",
		seriesId,
		creatorId,
		genreId,
	});
	await linkTag(mediaItemId, tagId);

	const instanceId = await insertInstance({
		mediaItemId,
		rating: "9.0",
		reviewText: "Great",
		startedAt: "2021-11-01",
		completedAt: "2021-11-02",
		seasonReviews: SEASON_REVIEWS,
		consumptionInfo: CONSUMPTION_INFO,
	});

	await insertView({
		userId,
		name: "Sci-fi backlog",
		subject: "items",
		filters: { tags: ["Favorites"], genres: ["Science Fiction"] },
		displayOrder: 2,
	});

	await insertUserSettings({
		userId,
		defaultLibrarySortBy: "title",
		defaultLibrarySortDirection: "asc",
		defaultSeriesSortBy: "name",
		defaultSeriesSortDirection: "desc",
		defaultBookConsumptionMethod: "ebook",
		defaultMovieConsumptionMethod: "streaming",
		defaultTvShowConsumptionMethod: "streaming",
		defaultGamePlatform: "pc",
		defaultGameControlMethod: "controller",
	});

	return {
		seriesId,
		creatorId,
		genreId,
		tagId,
		mediaItemId,
		instanceId,
	};
}

const VOLATILE_KEYS = new Set([
	"id",
	"seriesId",
	"creatorId",
	"genreId",
	"mediaItemId",
	"tagId",
	"exportedAt",
]);

/** Drops the keys a restore is expected to renumber, so two exports can be compared. */
function stripVolatile(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(stripVolatile);
	}
	if (value === null || typeof value !== "object" || value instanceof Date) {
		return value;
	}
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.filter(([key]) => !VOLATILE_KEYS.has(key))
			.map(([key, entryValue]) => [key, stripVolatile(entryValue)]),
	);
}

describe("exportBackup", () => {
	it("emits version 5 with every collection present", async () => {
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			title: "Dune",
		});

		const backup = await exportBackup(USER_A);

		expect(backup.version).toBe(5);
		expect(backup).not.toHaveProperty("mediaItemMetadata");
		expect(backup).not.toHaveProperty("customReports");
		expect(backup).toHaveProperty("tags");
		expect(backup).toHaveProperty("mediaItemTags");
		expect(backup).toHaveProperty("creators");
		expect(backup).toHaveProperty("genres");
		expect(backup).toHaveProperty("userSettings");
		expect(backup.mediaItems[0]).toMatchObject({
			title: "Dune",
			type: MediaItemType.MOVIE,
		});
	});

	it("exports tags and the item-to-tag join", async () => {
		const mediaItemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
		});
		const tagId = await insertTag({ userId: USER_A, name: "Favorites" });
		await linkTag(mediaItemId, tagId);

		const backup = await exportBackup(USER_A);

		expect(backup.tags).toHaveLength(1);
		expect(backup.tags[0].name).toBe("Favorites");
		expect(backup.mediaItemTags).toEqual([{ mediaItemId, tagId }]);
	});

	it("exports creators and genres", async () => {
		await insertCreator({ userId: USER_A, name: "Denis Villeneuve" });
		await insertGenre({ userId: USER_A, name: "Science Fiction" });

		const backup = await exportBackup(USER_A);

		expect(backup.creators).toHaveLength(1);
		expect(backup.creators[0].name).toBe("Denis Villeneuve");
		expect(backup.genres).toHaveLength(1);
		expect(backup.genres[0].name).toBe("Science Fiction");
	});

	it("exports user settings", async () => {
		await insertUser(USER_A);
		await insertUserSettings({
			userId: USER_A,
			defaultLibrarySortBy: "title",
		});

		const backup = await exportBackup(USER_A);

		expect(backup.userSettings).toMatchObject({
			defaultLibrarySortBy: "title",
		});
	});

	it("carries creatorId, genreId and expectedReleaseDate on media items", async () => {
		const creatorId = await insertCreator({ userId: USER_A, name: "Nolan" });
		const genreId = await insertGenre({ userId: USER_A, name: "Thriller" });
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			creatorId,
			genreId,
			expectedReleaseDate: "2027-03-01",
		});

		const backup = await exportBackup(USER_A);

		expect(backup.mediaItems[0]).toMatchObject({
			creatorId,
			genreId,
			expectedReleaseDate: "2027-03-01",
		});
	});

	it("carries nextItemStatus on series", async () => {
		await insertSeries({
			userId: USER_A,
			name: "Trilogy",
			type: MediaItemType.MOVIE,
			nextItemStatus: NextItemStatus.PURCHASED,
		});

		const backup = await exportBackup(USER_A);

		expect(backup.series[0].nextItemStatus).toBe(NextItemStatus.PURCHASED);
	});

	it("carries seasonReviews and consumptionInfo on instances", async () => {
		const mediaItemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.TV_SHOW,
		});
		await insertInstance({
			mediaItemId,
			seasonReviews: SEASON_REVIEWS,
			consumptionInfo: CONSUMPTION_INFO,
		});

		const backup = await exportBackup(USER_A);

		expect(backup.mediaItemInstances[0].seasonReviews).toEqual(SEASON_REVIEWS);
		expect(backup.mediaItemInstances[0].consumptionInfo).toEqual(
			CONSUMPTION_INFO,
		);
	});

	it("includes only the caller's rows in every collection", async () => {
		await insertMediaItem({ userId: USER_A, type: MediaItemType.BOOK });
		await seedFullLibrary(USER_B);

		const backup = await exportBackup(USER_A);

		expect(backup.mediaItems).toHaveLength(1);
		expect(backup.series).toHaveLength(0);
		expect(backup.tags).toHaveLength(0);
		expect(backup.mediaItemTags).toHaveLength(0);
		expect(backup.creators).toHaveLength(0);
		expect(backup.genres).toHaveLength(0);
		expect(backup.userSettings).toBeNull();
	});
});

describe("importBackup round trip", () => {
	it("restores items, instances and series", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "Trilogy",
			type: MediaItemType.MOVIE,
		});
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			title: "Dune",
			seriesId,
			status: MediaItemStatus.COMPLETED,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-01-01",
			rating: "8.5",
		});

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems).toHaveLength(1);
		expect(restored.mediaItemInstances).toHaveLength(1);
		expect(restored.series).toHaveLength(1);
		expect(restored.mediaItems[0].title).toBe("Dune");
		expect(restored.mediaItems[0].status).toBe(MediaItemStatus.COMPLETED);
	});

	it("preserves every moved field exactly", async () => {
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			title: "Dune",
			description: "A description",
			coverImageUrl: "http://example.test/a.jpg",
			releaseDate: "2021-10-22",
			externalId: "tmdb-438631",
			externalSource: "tmdb",
			metadata: { director: "Denis Villeneuve", runtime: 155 },
		});

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const [row] = await testDb
			.select()
			.from(mediaItems)
			.where(eq(mediaItems.userId, USER_A));

		expect(row).toMatchObject({
			title: "Dune",
			description: "A description",
			coverImageUrl: "http://example.test/a.jpg",
			releaseDate: "2021-10-22",
			externalId: "tmdb-438631",
			externalSource: "tmdb",
			metadata: { director: "Denis Villeneuve", runtime: 155 },
		});
	});

	it("keeps every collection populated", async () => {
		await seedFullLibrary(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.series).toHaveLength(1);
		expect(restored.mediaItems).toHaveLength(1);
		expect(restored.mediaItemInstances).toHaveLength(1);
		expect(restored.views).toHaveLength(1);
		expect(restored.tags).toHaveLength(1);
		expect(restored.mediaItemTags).toHaveLength(1);
		expect(restored.creators).toHaveLength(1);
		expect(restored.genres).toHaveLength(1);
		expect(restored.userSettings).not.toBeNull();
	});

	it("remaps creatorId to the restored creator", async () => {
		await seedFullLibrary(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems[0].creatorId).toBe(restored.creators[0].id);
		expect(restored.creators[0].name).toBe("Denis Villeneuve");
	});

	it("remaps genreId to the restored genre", async () => {
		await seedFullLibrary(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems[0].genreId).toBe(restored.genres[0].id);
		expect(restored.genres[0].name).toBe("Science Fiction");
	});

	it("remaps both sides of the item-to-tag join", async () => {
		await seedFullLibrary(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItemTags).toEqual([
			{
				mediaItemId: restored.mediaItems[0].id,
				tagId: restored.tags[0].id,
			},
		]);
		expect(restored.mediaItems[0].title).toBe("Dune");
		expect(restored.tags[0].name).toBe("Favorites");
	});

	it("preserves the scalar user settings", async () => {
		await seedFullLibrary(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.userSettings).toMatchObject({
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "asc",
			defaultSeriesSortBy: "name",
			defaultSeriesSortDirection: "desc",
			defaultBookConsumptionMethod: "ebook",
			defaultMovieConsumptionMethod: "streaming",
			defaultTvShowConsumptionMethod: "streaming",
			defaultGamePlatform: "pc",
			defaultGameControlMethod: "controller",
		});
	});

	it("preserves series nextItemStatus", async () => {
		await seedFullLibrary(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.series[0].nextItemStatus).toBe(NextItemStatus.PURCHASED);
	});

	it("preserves instance seasonReviews and consumptionInfo", async () => {
		await seedFullLibrary(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItemInstances[0].seasonReviews).toEqual(
			SEASON_REVIEWS,
		);
		expect(restored.mediaItemInstances[0].consumptionInfo).toEqual(
			CONSUMPTION_INFO,
		);
	});

	it("preserves expectedReleaseDate", async () => {
		await seedFullLibrary(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems[0].expectedReleaseDate).toBe("2027-03-01");
	});

	it("is idempotent apart from renumbered ids", async () => {
		await seedFullLibrary(USER_A);
		const before = await exportBackup(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const after = await exportBackup(USER_A);
		expect(stripVolatile(after)).toEqual(stripVolatile(before));
	});

	it("still remaps seriesId", async () => {
		await seedFullLibrary(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems[0].seriesId).toBe(restored.series[0].id);
	});

	it("replaces only the caller's data", async () => {
		await insertMediaItem({ userId: USER_A, type: MediaItemType.BOOK });
		const itemB = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.BOOK,
			title: "B's book",
		});

		await importBackup(buildEmptyV3Backup(), USER_A);

		const remaining = await testDb.select().from(mediaItems);
		expect(remaining).toHaveLength(1);
		expect(remaining[0].id).toBe(itemB);
	});
});

describe("importBackup version 2 compatibility", () => {
	it("restores items, series and instances", async () => {
		await importBackup(backupSchema.parse(buildV2Backup()), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems).toHaveLength(1);
		expect(restored.series).toHaveLength(1);
		expect(restored.mediaItemInstances).toHaveLength(1);
		expect(restored.mediaItems[0].title).toBe("Dune");
	});

	it("recovers the columns a v2 import used to strip", async () => {
		await importBackup(backupSchema.parse(buildV2Backup()), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems[0].expectedReleaseDate).toBe("2027-03-01");
		expect(restored.series[0].nextItemStatus).toBe(NextItemStatus.PURCHASED);
		expect(restored.mediaItemInstances[0].seasonReviews).toEqual(
			SEASON_REVIEWS,
		);
		expect(restored.mediaItemInstances[0].consumptionInfo).toEqual(
			CONSUMPTION_INFO,
		);
	});

	it("nulls creatorId and genreId, whose rows a v2 file never carried", async () => {
		await importBackup(backupSchema.parse(buildV2Backup()), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems[0].creatorId).toBeNull();
		expect(restored.mediaItems[0].genreId).toBeNull();
	});

	it("leaves the collections v2 never had empty", async () => {
		await importBackup(backupSchema.parse(buildV2Backup()), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.tags).toHaveLength(0);
		expect(restored.mediaItemTags).toHaveLength(0);
		expect(restored.creators).toHaveLength(0);
		expect(restored.genres).toHaveLength(0);
		expect(restored.userSettings).toBeNull();
	});

	it("imports an older v2 file that omits the new optional columns", async () => {
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

		await importBackup(
			backupSchema.parse({
				...backup,
				series: [seriesWithoutNewColumns],
				mediaItems: [itemWithoutNewColumns],
				mediaItemInstances: [instanceWithoutNewColumns],
			}),
			USER_A,
		);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems[0].expectedReleaseDate).toBeNull();
		expect(restored.series[0].nextItemStatus).toBeNull();
		expect(restored.mediaItemInstances[0].seasonReviews).toBeNull();
		expect(restored.mediaItemInstances[0].consumptionInfo).toBeNull();
	});
});

describe("importBackup version 1 compatibility", () => {
	it("flattens the metadata array onto items", async () => {
		await importBackup(backupSchema.parse(buildV1Backup()), USER_A);

		const [row] = await testDb
			.select()
			.from(mediaItems)
			.where(eq(mediaItems.userId, USER_A));

		expect(row).toMatchObject({
			title: "Dune",
			description: "Legacy description",
			coverImageUrl: "http://example.test/legacy.jpg",
			releaseDate: "2021-10-22",
			externalId: "tmdb-438631",
			externalSource: "tmdb",
			metadata: { director: "Denis Villeneuve" },
		});
	});

	it("silently drops metadata rows no item references", async () => {
		await importBackup(backupSchema.parse(buildV1Backup()), USER_A);

		const rows = await testDb
			.select()
			.from(mediaItems)
			.where(eq(mediaItems.userId, USER_A));

		expect(rows).toHaveLength(1);
		expect(rows[0].externalId).not.toBe("hc-orphan");
	});

	it("skips an item whose metadata id is missing", async () => {
		const backup = buildV1Backup();
		backup.mediaItems[0].mediaItemMetadataId = 9999;

		await importBackup(backupSchema.parse(backup), USER_A);

		const rows = await testDb
			.select()
			.from(mediaItems)
			.where(eq(mediaItems.userId, USER_A));
		expect(rows).toHaveLength(0);
	});

	it("carries instances across the v1 flattening", async () => {
		await importBackup(backupSchema.parse(buildV1Backup()), USER_A);

		const backup = await exportBackup(USER_A);
		expect(backup.mediaItemInstances).toHaveLength(1);
		expect(backup.mediaItemInstances[0].reviewText).toBe("Legacy review");
	});

	// The importing user is always taken from the session, never the file.
	it("ignores a userId embedded in the file", async () => {
		const backup = buildV1Backup() as Record<string, unknown>;
		backup.userId = USER_B;

		await importBackup(backupSchema.parse(backup), USER_A);

		const rows = await testDb.select().from(mediaItems);
		expect(rows).toHaveLength(1);
		expect(rows[0].userId).toBe(USER_A);
	});

	it("leaves the new collections empty and nulls creatorId/genreId", async () => {
		await importBackup(backupSchema.parse(buildV1Backup()), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems[0].creatorId).toBeNull();
		expect(restored.mediaItems[0].genreId).toBeNull();
		expect(restored.tags).toHaveLength(0);
		expect(restored.mediaItemTags).toHaveLength(0);
		expect(restored.creators).toHaveLength(0);
		expect(restored.genres).toHaveLength(0);
		expect(restored.userSettings).toBeNull();
	});
});

describe("importBackup user scoping", () => {
	it("does not delete another user's tags or joins", async () => {
		await seedFullLibrary(USER_B);

		await importBackup(buildEmptyV3Backup(), USER_A);

		const remainingTags = await testDb
			.select()
			.from(tags)
			.where(eq(tags.userId, USER_B));
		expect(remainingTags).toHaveLength(1);
		expect(await testDb.select().from(mediaItemTags)).toHaveLength(1);
	});

	it("does not delete another user's creators or genres", async () => {
		await seedFullLibrary(USER_B);

		await importBackup(buildEmptyV3Backup(), USER_A);

		expect(
			await testDb.select().from(creators).where(eq(creators.userId, USER_B)),
		).toHaveLength(1);
		expect(
			await testDb.select().from(genres).where(eq(genres.userId, USER_B)),
		).toHaveLength(1);
	});

	it("does not delete another user's settings", async () => {
		await seedFullLibrary(USER_B);

		await importBackup(buildEmptyV3Backup(), USER_A);

		const [remainingSettings] = await testDb
			.select()
			.from(userSettings)
			.where(eq(userSettings.userId, USER_B));
		expect(remainingSettings.defaultLibrarySortBy).toBe("title");
	});

	it("replaces only the caller's series and views", async () => {
		await seedFullLibrary(USER_B);
		await insertSeries({
			userId: USER_A,
			name: "A's series",
			type: MediaItemType.BOOK,
		});
		await insertView({ userId: USER_A, name: "A's view" });

		await importBackup(buildEmptyV3Backup(), USER_A);

		const remainingSeries = await testDb.select().from(series);
		expect(remainingSeries).toHaveLength(1);
		expect(remainingSeries[0].userId).toBe(USER_B);

		const remainingViews = await testDb.select().from(views);
		expect(remainingViews).toHaveLength(1);
		expect(remainingViews[0].userId).toBe(USER_B);
	});

	it("allows two users to hold identically-named tags, creators and genres", async () => {
		await seedFullLibrary(USER_B);
		await seedFullLibrary(USER_A);
		const backup = await exportThroughJson(USER_A);

		await importBackup(backup, USER_A);

		expect(
			await testDb.select().from(tags).where(eq(tags.name, "Favorites")),
		).toHaveLength(2);
		expect(
			await testDb
				.select()
				.from(creators)
				.where(eq(creators.name, "Denis Villeneuve")),
		).toHaveLength(2);
		expect(
			await testDb
				.select()
				.from(genres)
				.where(eq(genres.name, "Science Fiction")),
		).toHaveLength(2);
	});
});

describe("importBackup dangling references", () => {
	it("skips join rows whose tag or media item is missing", async () => {
		await seedFullLibrary(USER_A);
		const backup = await exportThroughJson(USER_A);
		if (backup.version !== 5) {
			throw new Error("expected a version 5 export");
		}
		backup.mediaItemTags = [
			...backup.mediaItemTags,
			{ mediaItemId: 9999, tagId: backup.tags[0].id },
			{ mediaItemId: backup.mediaItems[0].id, tagId: 9999 },
		];

		await importBackup(backup, USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItemTags).toHaveLength(1);
	});

	it("nulls creatorId and genreId that no row in the file matches", async () => {
		await seedFullLibrary(USER_A);
		const backup = await exportThroughJson(USER_A);
		if (backup.version !== 5) {
			throw new Error("expected a version 5 export");
		}
		backup.creators = [];
		backup.genres = [];

		await importBackup(backup, USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.mediaItems[0].creatorId).toBeNull();
		expect(restored.mediaItems[0].genreId).toBeNull();
	});

	it("imports user settings when the file has no reports at all", async () => {
		await insertUser(USER_A);
		await insertUserSettings({
			userId: USER_A,
			defaultGamePlatform: "pc",
		});

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.userSettings).toMatchObject({
			defaultGamePlatform: "pc",
		});
	});

	it("wipes all of the caller's data when the file is empty", async () => {
		await seedFullLibrary(USER_A);
		await seedFullLibrary(USER_B);

		await importBackup(buildEmptyV3Backup(), USER_A);

		const restored = await exportBackup(USER_A);
		expect(restored.series).toHaveLength(0);
		expect(restored.mediaItems).toHaveLength(0);
		expect(restored.mediaItemInstances).toHaveLength(0);
		expect(restored.views).toHaveLength(0);
		expect(restored.tags).toHaveLength(0);
		expect(restored.mediaItemTags).toHaveLength(0);
		expect(restored.creators).toHaveLength(0);
		expect(restored.genres).toHaveLength(0);
		expect(restored.userSettings).toBeNull();

		const untouched = await exportBackup(USER_B);
		expect(untouched.mediaItems).toHaveLength(1);
		expect(untouched.tags).toHaveLength(1);
	});

	it("produces the same row counts when the same file is imported twice", async () => {
		await seedFullLibrary(USER_A);
		const backup = await exportThroughJson(USER_A);

		await importBackup(backup, USER_A);
		const afterFirst = await exportBackup(USER_A);
		await importBackup(backup, USER_A);
		const afterSecond = await exportBackup(USER_A);

		expect(stripVolatile(afterSecond)).toEqual(stripVolatile(afterFirst));
	});
});

describe("backupSchema validation", () => {
	it("rejects an unrecognized version", () => {
		const parsed = backupSchema.safeParse({
			...buildV1Backup(),
			version: 6,
		});
		expect(parsed.success).toBe(false);
	});

	it("accepts version 1, 2 and 3 documents", () => {
		expect(backupSchema.safeParse(buildV1Backup()).success).toBe(true);
		expect(backupSchema.safeParse(buildV2Backup()).success).toBe(true);
		expect(backupSchema.safeParse(buildEmptyV3Backup()).success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Custom view order
// ---------------------------------------------------------------------------

describe("view item order backup", () => {
	/** Seeds a custom-ordered view holding two placed items, and returns their ids. */
	async function seedOrderedView(userId: string) {
		await insertUser(userId);

		const viewId = await insertView({
			userId,
			name: "Ancient Sumeria",
			subject: "items",
			filters: { sortBy: "custom", sortDirection: "asc" },
		});
		const firstId = await insertMediaItem({
			userId,
			type: MediaItemType.BOOK,
			title: "Zebra",
		});
		const secondId = await insertMediaItem({
			userId,
			type: MediaItemType.BOOK,
			title: "Apple",
		});
		await insertViewItemOrder({
			viewId,
			mediaItemId: firstId,
			position: 0,
		});
		await insertViewItemOrder({
			viewId,
			mediaItemId: secondId,
			position: 1,
		});

		return { viewId, firstId, secondId };
	}

	/** The restored order, read back as titles in position order. */
	async function readRestoredOrder(userId: string) {
		const rows = await testDb
			.select({ title: mediaItems.title, position: viewItemOrder.position })
			.from(viewItemOrder)
			.innerJoin(views, eq(views.id, viewItemOrder.viewId))
			.innerJoin(mediaItems, eq(mediaItems.id, viewItemOrder.mediaItemId))
			.where(eq(views.userId, userId))
			.orderBy(asc(viewItemOrder.position));
		return rows;
	}

	it("exports version 4 with the saved order", async () => {
		await seedOrderedView(USER_A);

		const backup = await exportThroughJson(USER_A);

		expect(backup.version).toBe(5);
		expect(backup.version === 5 && backup.viewItemOrder).toHaveLength(2);
	});

	it("exports only the caller's order rows", async () => {
		await seedOrderedView(USER_A);
		await seedOrderedView(USER_B);

		const backup = await exportThroughJson(USER_A);

		expect(backup.version === 5 && backup.viewItemOrder).toHaveLength(2);
	});

	it("restores the order against the renumbered view and item ids", async () => {
		const { viewId, firstId } = await seedOrderedView(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await readRestoredOrder(USER_A);
		expect(restored.map((row) => row.title)).toEqual(["Zebra", "Apple"]);

		// The restore re-inserts every row, so nothing may still point at the old ids.
		const staleViewRows = await testDb
			.select()
			.from(viewItemOrder)
			.where(eq(viewItemOrder.viewId, viewId));
		expect(staleViewRows).toHaveLength(0);
		const staleItemRows = await testDb
			.select()
			.from(viewItemOrder)
			.where(eq(viewItemOrder.mediaItemId, firstId));
		expect(staleItemRows).toHaveLength(0);
	});

	it("preserves the position values exactly", async () => {
		await seedOrderedView(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const restored = await readRestoredOrder(USER_A);
		expect(restored.map((row) => row.position)).toEqual([0, 1]);
	});

	it("skips an order row whose view is missing from the file", async () => {
		await seedOrderedView(USER_A);
		const backup = await exportThroughJson(USER_A);
		if (backup.version !== 5) {
			throw new Error("expected a version 5 export");
		}
		backup.views = [];

		await importBackup(backup, USER_A);

		expect(await readRestoredOrder(USER_A)).toHaveLength(0);
	});

	it("skips an order row whose media item is missing from the file", async () => {
		await seedOrderedView(USER_A);
		const backup = await exportThroughJson(USER_A);
		if (backup.version !== 5) {
			throw new Error("expected a version 5 export");
		}
		backup.mediaItems = [];

		await importBackup(backup, USER_A);

		expect(await readRestoredOrder(USER_A)).toHaveLength(0);
	});

	it("restores a v3 file with no order rows", async () => {
		await seedOrderedView(USER_A);

		await importBackup(buildEmptyV3Backup(), USER_A);

		expect(await readRestoredOrder(USER_A)).toHaveLength(0);
	});

	it("restores a v2 file with no order rows", async () => {
		await seedOrderedView(USER_A);

		await importBackup(backupSchema.parse(buildV2Backup()), USER_A);

		expect(await readRestoredOrder(USER_A)).toHaveLength(0);
	});

	it("restores a v1 file with no order rows", async () => {
		await seedOrderedView(USER_A);

		await importBackup(backupSchema.parse(buildV1Backup()), USER_A);

		expect(await readRestoredOrder(USER_A)).toHaveLength(0);
	});

	it("replaces only the importing user's order rows", async () => {
		await seedOrderedView(USER_A);
		await seedOrderedView(USER_B);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		expect(await readRestoredOrder(USER_B)).toHaveLength(2);
	});

	it("is idempotent across repeated imports", async () => {
		await seedOrderedView(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);
		const afterFirst = await readRestoredOrder(USER_A);
		await importBackup(await exportThroughJson(USER_A), USER_A);
		const afterSecond = await readRestoredOrder(USER_A);

		expect(afterSecond).toEqual(afterFirst);
	});

	it("sorts a custom view by the restored order", async () => {
		await seedOrderedView(USER_A);

		await importBackup(await exportThroughJson(USER_A), USER_A);

		const [restoredView] = await testDb
			.select()
			.from(views)
			.where(eq(views.userId, USER_A));
		const result = await runItemQuery(
			{ sortBy: "custom", sortDirection: "asc" },
			USER_A,
			0,
			restoredView.id,
		);

		expect(result.items.map((item) => item.title)).toEqual(["Zebra", "Apple"]);
	});
});
