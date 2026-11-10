import { beforeEach, describe, expect, it, vi } from "vitest";

// Redirect all db calls to the test database.
// vi.mock is hoisted before imports, so handleAddToLibrary will see testDb.
vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));
vi.mock("#/features/mediaItemSearch/api/hardcover", () => ({
	fetchSeriesInfo: vi.fn().mockResolvedValue(null),
	fetchCreatorBio: vi.fn().mockResolvedValue(null),
}));
vi.mock("#/features/mediaItemSearch/api/tmdb", () => ({
	fetchMovieDetails: vi.fn().mockResolvedValue({}),
	fetchTvShowDetails: vi.fn().mockResolvedValue({}),
	fetchCreatorBio: vi.fn().mockResolvedValue(null),
	search: vi.fn().mockResolvedValue([]),
}));
vi.mock("#/features/mediaItemSearch/api/itunes", () => ({
	fetchPodcastChannelInfo: vi.fn().mockResolvedValue(null),
	searchPodcasts: vi.fn().mockResolvedValue([]),
}));
vi.mock("#/features/mediaItemSearch/api/igdb", () => ({
	search: vi.fn().mockResolvedValue([]),
}));

import { asc, count, eq } from "drizzle-orm";
import { creators, mediaItems, series } from "#/database/schema";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertSeries,
	truncateAll,
} from "#/tests/integration/helpers";
import { handleAddToLibrary } from "../mediaItemSearch.server";

const USER = "test-user";

const BASE_BOOK_INPUT = {
	externalId: "hc-123",
	externalSource: "hardcover",
	type: MediaItemType.BOOK,
	title: "Dune",
	metadata: {
		author: "Frank Herbert",
		series: "Dune",
	},
} as const;

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleAddToLibrary", () => {
	it("adding the same item twice does not create duplicate metadata, series, or creator rows", async () => {
		await handleAddToLibrary(BASE_BOOK_INPUT, USER);
		const secondResult = await handleAddToLibrary(BASE_BOOK_INPUT, USER);

		const [metadataCount] = await testDb
			.select({ count: count() })
			.from(mediaItems);
		const [seriesCount] = await testDb.select({ count: count() }).from(series);
		const [creatorsCount] = await testDb
			.select({ count: count() })
			.from(creators);
		const [itemsCount] = await testDb
			.select({ count: count() })
			.from(mediaItems);

		expect(metadataCount?.count).toBe(1);
		expect(seriesCount?.count).toBe(1);
		expect(creatorsCount?.count).toBe(1);
		expect(itemsCount?.count).toBe(1);

		// Both calls should return the same mediaItemId
		const firstResult = await handleAddToLibrary(BASE_BOOK_INPUT, USER);
		expect(firstResult.mediaItemId).toBe(secondResult.mediaItemId);
	});

	it("links to an existing series instead of creating a new one", async () => {
		const existingSeriesId = await insertSeries({
			userId: USER,
			name: "Dune",
			type: MediaItemType.BOOK,
		});

		await handleAddToLibrary(BASE_BOOK_INPUT, USER);

		const [seriesCount] = await testDb.select({ count: count() }).from(series);
		expect(seriesCount?.count).toBe(1);

		const [item] = await testDb
			.select({ seriesId: mediaItems.seriesId })
			.from(mediaItems);
		expect(item?.seriesId).toBe(existingSeriesId);
	});

	it("backfills seriesId and creatorId on an existing item that had null values", async () => {
		const existingItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			title: "Dune",
			externalId: "hc-123",
			externalSource: "hardcover",
			userId: USER,
			seriesId: undefined,
			creatorId: undefined,
		});

		const result = await handleAddToLibrary(BASE_BOOK_INPUT, USER);

		// Should return the existing item, not create a new one
		expect(result.mediaItemId).toBe(existingItemId);

		const [updated] = await testDb
			.select({
				seriesId: mediaItems.seriesId,
				creatorId: mediaItems.creatorId,
			})
			.from(mediaItems)
			.where(eq(mediaItems.id, existingItemId));

		expect(updated?.seriesId).not.toBeNull();
		expect(updated?.creatorId).not.toBeNull();
	});

	it("syncs the series status after backfilling seriesId onto an existing item", async () => {
		const existingSeriesId = await insertSeries({
			userId: USER,
			name: "Dune",
			type: MediaItemType.BOOK,
		});
		await insertMediaItem({
			type: MediaItemType.BOOK,
			title: "Dune",
			externalId: "hc-123",
			externalSource: "hardcover",
			userId: USER,
			status: MediaItemStatus.IN_PROGRESS,
			seriesId: undefined,
		});

		await handleAddToLibrary(BASE_BOOK_INPUT, USER);

		const [updatedSeries] = await testDb
			.select({ status: series.status })
			.from(series)
			.where(eq(series.id, existingSeriesId));
		expect(updatedSeries?.status).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("stores a pre-0 CE release date", async () => {
		await handleAddToLibrary(
			{ ...BASE_BOOK_INPUT, releaseDate: "1200-01-01 BC" },
			USER,
		);

		const [stored] = await testDb
			.select({ releaseDate: mediaItems.releaseDate })
			.from(mediaItems);

		expect(stored?.releaseDate).toBe("1200-01-01 BC");
	});

	// Documents why pre-0 CE years are stored in era notation: Postgres reads the
	// leading "-1200" as a timezone displacement and rejects the whole value.
	it("rejects a negative-year release date", async () => {
		const insertNegativeYear = handleAddToLibrary(
			{ ...BASE_BOOK_INPUT, releaseDate: "-1200-01-01" },
			USER,
		);

		// Drizzle wraps the driver error, so the SQLSTATE lives on the cause
		await expect(insertNegativeYear).rejects.toMatchObject({
			cause: { code: "22009" },
		});
	});
});

describe("release date ordering", () => {
	it("sorts pre-0 CE dates before CE dates, oldest first", async () => {
		await insertMediaItem({
			userId: USER,
			type: MediaItemType.BOOK,
			title: "Modern",
			releaseDate: "2020-01-01",
		});
		await insertMediaItem({
			userId: USER,
			type: MediaItemType.BOOK,
			title: "Gilgamesh",
			releaseDate: "1200-01-01 BC",
		});
		await insertMediaItem({
			userId: USER,
			type: MediaItemType.BOOK,
			title: "Iliad",
			releaseDate: "0800-01-01 BC",
		});

		const rows = await testDb
			.select({ title: mediaItems.title })
			.from(mediaItems)
			.orderBy(asc(mediaItems.releaseDate));

		expect(rows.map((row) => row.title)).toEqual([
			"Gilgamesh",
			"Iliad",
			"Modern",
		]);
	});
});

// ---------------------------------------------------------------------------
// Per-user ownership — the shape the shared-metadata schema could not express
// ---------------------------------------------------------------------------

const USER_B = "test-user-b";

describe("two users adding the same external item", () => {
	it("gives each user their own item row", async () => {
		await handleAddToLibrary(BASE_BOOK_INPUT, USER);
		await handleAddToLibrary(BASE_BOOK_INPUT, USER_B);

		const rows = await testDb
			.select({ userId: mediaItems.userId, externalId: mediaItems.externalId })
			.from(mediaItems)
			.orderBy(asc(mediaItems.userId));

		expect(rows).toHaveLength(2);
		expect(rows.map((row) => row.userId)).toEqual([USER, USER_B]);
		// Same external identity, no unique violation.
		expect(new Set(rows.map((row) => row.externalId))).toEqual(
			new Set([BASE_BOOK_INPUT.externalId]),
		);
	});

	it("does not let one user's add overwrite the other's edits", async () => {
		const { mediaItemId } = await handleAddToLibrary(BASE_BOOK_INPUT, USER);
		await testDb
			.update(mediaItems)
			.set({
				title: "A's custom title",
				description: "A's description",
				coverImageUrl: "http://example.test/a.jpg",
				metadata: { author: "A's correction" },
			})
			.where(eq(mediaItems.id, mediaItemId));

		await handleAddToLibrary(BASE_BOOK_INPUT, USER_B);

		const [rowA] = await testDb
			.select()
			.from(mediaItems)
			.where(eq(mediaItems.id, mediaItemId));
		expect(rowA?.title).toBe("A's custom title");
		expect(rowA?.description).toBe("A's description");
		expect(rowA?.coverImageUrl).toBe("http://example.test/a.jpg");
		expect(rowA?.metadata).toEqual({ author: "A's correction" });
	});

	it("gives each user their own series and creator rows", async () => {
		await handleAddToLibrary(BASE_BOOK_INPUT, USER);
		await handleAddToLibrary(BASE_BOOK_INPUT, USER_B);

		const [seriesCount] = await testDb.select({ count: count() }).from(series);
		const [creatorsCount] = await testDb
			.select({ count: count() })
			.from(creators);

		expect(seriesCount?.count).toBe(2);
		expect(creatorsCount?.count).toBe(2);
	});
});
