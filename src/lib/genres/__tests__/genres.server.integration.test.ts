import { asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import {
	type FilterAndSortOptions,
	type Genre,
	genres,
	mediaItems,
	views,
} from "#/database/schema";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { testDb } from "#/tests/integration/db";
import {
	insertGenre,
	insertInstance,
	insertMediaItem,
	insertTag,
	insertView,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	createGenre,
	deleteGenre,
	fetchGenreDetails,
	getGenresWithUsage,
	mergeGenres,
	renameGenre,
} from "../genres.server";

const USER_A = "user-a";
const USER_B = "user-b";

const SHARED_EXTERNAL = {
	externalId: "hc-shared",
	externalSource: "hardcover",
} as const;

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertItem(
	title: string,
	genreId?: number,
	userId: string = USER_A,
): Promise<number> {
	return insertMediaItem({ userId, type: MediaItemType.BOOK, title, genreId });
}

async function readGenreRow(genreId: number): Promise<Genre | undefined> {
	const [row] = await testDb
		.select()
		.from(genres)
		.where(eq(genres.id, genreId));
	return row;
}

async function readGenreRows(userId: string): Promise<Genre[]> {
	return testDb
		.select()
		.from(genres)
		.where(eq(genres.userId, userId))
		.orderBy(asc(genres.name));
}

async function readGenreIdForItem(itemId: number): Promise<number | null> {
	const [row] = await testDb
		.select({ genreId: mediaItems.genreId })
		.from(mediaItems)
		.where(eq(mediaItems.id, itemId));

	if (!row) throw new Error(`Media item ${itemId} not found`);
	return row.genreId;
}

async function readAllMediaItemIds(): Promise<number[]> {
	const rows = await testDb
		.select({ id: mediaItems.id })
		.from(mediaItems)
		.orderBy(asc(mediaItems.id));

	return rows.map((row) => row.id);
}

async function readItemMetadata(
	itemId: number,
): Promise<Record<string, unknown> | null> {
	const [row] = await testDb
		.select({ metadata: mediaItems.metadata })
		.from(mediaItems)
		.where(eq(mediaItems.id, itemId));

	if (!row) throw new Error(`Media item ${itemId} not found`);
	return row.metadata;
}

async function readViewFilters(viewId: number): Promise<FilterAndSortOptions> {
	const [row] = await testDb
		.select({ filters: views.filters })
		.from(views)
		.where(eq(views.id, viewId));

	if (!row) throw new Error(`View ${viewId} not found`);
	return row.filters;
}

/** Names with usage counts — the shape the assertions actually care about. */
async function readUsage(userId: string) {
	const rows = await getGenresWithUsage(userId);
	return rows.map((row) => ({ name: row.name, itemCount: row.itemCount }));
}

describe("fetchGenreDetails", () => {
	it("returns the genre's own items with their descriptive data", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Fiction" });
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Dune",
			coverImageUrl: "http://example.test/a.jpg",
			genreId,
		});

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.name).toBe("Fiction");
		expect(details.items).toHaveLength(1);
		expect(details.items[0]).toMatchObject({
			title: "Dune",
			coverImageUrl: "http://example.test/a.jpg",
		});
	});

	it("excludes another user's item sharing the same external identity", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Fiction" });
		const otherGenreId = await insertGenre({ userId: USER_B, name: "Fiction" });
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Mine",
			genreId,
			...SHARED_EXTERNAL,
		});
		await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.BOOK,
			title: "Theirs",
			genreId: otherGenreId,
			...SHARED_EXTERNAL,
		});

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.items.map((item) => item.title)).toEqual(["Mine"]);
	});

	it("orders by releaseDate then sortTitle", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Fiction" });
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "The Later One",
			releaseDate: "2024-01-01",
			genreId,
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "An Earlier One",
			releaseDate: "2020-01-01",
			genreId,
		});

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.items.map((item) => item.title)).toEqual([
			"An Earlier One",
			"The Later One",
		]);
	});

	it("attaches the latest completed rating per item", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Fiction" });
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			genreId,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-01-01",
			rating: "7.0",
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2025-01-01",
			rating: "9.0",
		});

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.items[0].rating).toBe(9);
	});

	it("rejects a genre owned by another user", async () => {
		const genreB = await insertGenre({ userId: USER_B, name: "Fiction" });

		await expect(fetchGenreDetails(genreB, USER_A)).rejects.toThrow(
			/not found/,
		);
	});

	it("returns an empty item list for a genre with no items", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Empty" });

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.items).toEqual([]);
	});

	it("includes stats computed from the genre's items", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Fiction" });
		const completedId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			status: MediaItemStatus.COMPLETED,
			genreId,
		});
		await insertInstance({
			mediaItemId: completedId,
			completedAt: "2024-01-01",
			rating: "4",
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			status: MediaItemStatus.BACKLOG,
			genreId,
		});

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.stats).toEqual({
			totalCount: 2,
			completedCount: 1,
			averageRating: 4,
		});
	});

	it("returns zero stats for a genre with no items", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Empty" });

		const details = await fetchGenreDetails(genreId, USER_A);

		expect(details.stats).toEqual({
			totalCount: 0,
			completedCount: 0,
			averageRating: null,
		});
	});
});

// ---------------------------------------------------------------------------
// getGenresWithUsage
// ---------------------------------------------------------------------------

describe("getGenresWithUsage", () => {
	it("returns the caller's genres with usage counts, ordered by name", async () => {
		const fictionId = await insertGenre({ userId: USER_A, name: "Fiction" });
		const sciFiId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		await insertItem("First", fictionId);
		await insertItem("Second", fictionId);
		await insertItem("Third", sciFiId);

		expect(await readUsage(USER_A)).toEqual([
			{ name: "Fiction", itemCount: 2 },
			{ name: "Sci-Fi", itemCount: 1 },
		]);
	});

	it("returns an unused genre with a count of zero", async () => {
		await insertGenre({ userId: USER_A, name: "Sci-Fi" });

		expect(await readUsage(USER_A)).toEqual([{ name: "Sci-Fi", itemCount: 0 }]);
	});

	it("excludes another user's genres", async () => {
		await insertGenre({ userId: USER_A, name: "Fiction" });
		await insertGenre({ userId: USER_B, name: "Sci-Fi" });

		expect(await readUsage(USER_A)).toEqual([
			{ name: "Fiction", itemCount: 0 },
		]);
	});

	it("does not count another user's items against a same-named genre", async () => {
		const ownGenreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const otherGenreId = await insertGenre({ userId: USER_B, name: "Sci-Fi" });
		await insertItem("Mine", ownGenreId);
		await insertItem("Theirs", otherGenreId, USER_B);
		await insertItem("Theirs Too", otherGenreId, USER_B);

		expect(await readUsage(USER_A)).toEqual([{ name: "Sci-Fi", itemCount: 1 }]);
	});

	it("returns an empty list for a user with no genres", async () => {
		await insertGenre({ userId: USER_B, name: "Sci-Fi" });

		expect(await getGenresWithUsage(USER_A)).toEqual([]);
	});

	it("does not count an item with no genre", async () => {
		await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		await insertItem("Ungenred");

		expect(await readUsage(USER_A)).toEqual([{ name: "Sci-Fi", itemCount: 0 }]);
	});
});

// ---------------------------------------------------------------------------
// createGenre
// ---------------------------------------------------------------------------

describe("createGenre", () => {
	it("creates the genre for the caller", async () => {
		expect(await createGenre("Sci-Fi", USER_A)).toEqual({ status: "ok" });

		expect(await readUsage(USER_A)).toEqual([{ name: "Sci-Fi", itemCount: 0 }]);
	});

	it("trims surrounding whitespace from the name", async () => {
		expect(await createGenre("  Space Opera  ", USER_A)).toEqual({
			status: "ok",
		});

		expect((await readGenreRows(USER_A)).map((row) => row.name)).toEqual([
			"Space Opera",
		]);
	});

	it("reports a name the caller already owns as a conflict", async () => {
		await insertGenre({ userId: USER_A, name: "Sci-Fi" });

		expect(await createGenre("Sci-Fi", USER_A)).toEqual({ status: "conflict" });

		expect((await readGenreRows(USER_A)).map((row) => row.name)).toEqual([
			"Sci-Fi",
		]);
	});

	it("does not treat a name owned only by another user as a conflict", async () => {
		const otherGenreId = await insertGenre({ userId: USER_B, name: "Sci-Fi" });

		expect(await createGenre("Sci-Fi", USER_A)).toEqual({ status: "ok" });

		const ownGenreRows = await readGenreRows(USER_A);
		expect(ownGenreRows.map((row) => row.name)).toEqual(["Sci-Fi"]);
		expect(ownGenreRows[0]?.id).not.toBe(otherGenreId);
	});

	it("does not treat a differently cased name as a conflict", async () => {
		await insertGenre({ userId: USER_A, name: "Sci-Fi" });

		expect(await createGenre("sci-fi", USER_A)).toEqual({ status: "ok" });

		expect((await readGenreRows(USER_A)).map((row) => row.name).sort()).toEqual(
			["Sci-Fi", "sci-fi"],
		);
	});

	it("rejects a whitespace-only name", async () => {
		await expect(createGenre("   ", USER_A)).rejects.toThrow(
			"Taxonomy name cannot be empty",
		);

		expect(await readGenreRows(USER_A)).toEqual([]);
	});

	it("leaves saved view genre filters alone", async () => {
		// A stale name in a view filter is legitimately revived by the create.
		const viewId = await insertView({
			userId: USER_A,
			filters: { genres: ["Sci-Fi"] },
		});

		await createGenre("Sci-Fi", USER_A);

		expect(await readViewFilters(viewId)).toEqual({ genres: ["Sci-Fi"] });
	});
});

// ---------------------------------------------------------------------------
// renameGenre
// ---------------------------------------------------------------------------

describe("renameGenre", () => {
	it("renames the caller's genre", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });

		expect(await renameGenre(genreId, "Space Opera", USER_A)).toEqual({
			status: "ok",
		});
		expect((await readGenreRow(genreId))?.name).toBe("Space Opera");
	});

	it("trims surrounding whitespace from the new name", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });

		expect(await renameGenre(genreId, "  Space Opera  ", USER_A)).toEqual({
			status: "ok",
		});
		expect((await readGenreRow(genreId))?.name).toBe("Space Opera");
	});

	it("reports a name the caller already owns as a conflict", async () => {
		const sciFiId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const horrorId = await insertGenre({ userId: USER_A, name: "Horror" });
		const viewId = await insertView({
			userId: USER_A,
			filters: { genres: ["Sci-Fi", "Horror"] },
		});

		expect(await renameGenre(sciFiId, "Horror", USER_A)).toEqual({
			status: "conflict",
		});

		expect((await readGenreRow(sciFiId))?.name).toBe("Sci-Fi");
		expect((await readGenreRow(horrorId))?.name).toBe("Horror");
		expect(await readViewFilters(viewId)).toEqual({
			genres: ["Sci-Fi", "Horror"],
		});
	});

	it("does not treat a name owned only by another user as a conflict", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		await insertGenre({ userId: USER_B, name: "Space Opera" });

		expect(await renameGenre(genreId, "Space Opera", USER_A)).toEqual({
			status: "ok",
		});
		expect((await readGenreRow(genreId))?.name).toBe("Space Opera");
	});

	it("does not treat a genre's own current name as a conflict", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const viewId = await insertView({
			userId: USER_A,
			filters: { genres: ["Sci-Fi"] },
		});

		expect(await renameGenre(genreId, "Sci-Fi", USER_A)).toEqual({
			status: "ok",
		});
		expect((await readGenreRow(genreId))?.name).toBe("Sci-Fi");
		expect(await readViewFilters(viewId)).toEqual({ genres: ["Sci-Fi"] });
	});

	it("rejects a genre owned by another user and changes nothing", async () => {
		const genreId = await insertGenre({ userId: USER_B, name: "Sci-Fi" });
		const viewId = await insertView({
			userId: USER_B,
			filters: { genres: ["Sci-Fi"] },
		});

		await expect(renameGenre(genreId, "Space Opera", USER_A)).rejects.toThrow(
			`Genre ${genreId} not found`,
		);

		expect((await readGenreRow(genreId))?.name).toBe("Sci-Fi");
		expect(await readViewFilters(viewId)).toEqual({ genres: ["Sci-Fi"] });
	});

	it("rewrites the old name inside the caller's saved view genre filters", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		await insertGenre({ userId: USER_A, name: "Horror" });
		const viewId = await insertView({
			userId: USER_A,
			filters: { genres: ["Sci-Fi", "Horror"] },
		});

		await renameGenre(genreId, "Space Opera", USER_A);

		expect(await readViewFilters(viewId)).toEqual({
			genres: ["Space Opera", "Horror"],
		});
	});

	it("leaves a saved tag filter of the same name untouched", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		await insertTag({ userId: USER_A, name: "Sci-Fi" });
		const viewId = await insertView({
			userId: USER_A,
			filters: { tags: ["Sci-Fi"], genres: ["Sci-Fi"] },
		});

		await renameGenre(genreId, "Space Opera", USER_A);

		expect(await readViewFilters(viewId)).toEqual({
			tags: ["Sci-Fi"],
			genres: ["Space Opera"],
		});
	});

	it("keeps every item's genre pointed at the renamed row", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const firstItemId = await insertItem("First", genreId);
		const secondItemId = await insertItem("Second", genreId);

		await renameGenre(genreId, "Space Opera", USER_A);

		expect(await readGenreIdForItem(firstItemId)).toBe(genreId);
		expect(await readGenreIdForItem(secondItemId)).toBe(genreId);
	});

	it("does not touch the provider-seeded genres in item metadata", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Dune",
			genreId,
			metadata: { genres: ["Sci-Fi"] },
		});

		await renameGenre(genreId, "Space Opera", USER_A);

		expect(await readItemMetadata(itemId)).toEqual({ genres: ["Sci-Fi"] });
	});

	it("rejects a whitespace-only name and changes nothing", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const viewId = await insertView({
			userId: USER_A,
			filters: { genres: ["Sci-Fi"] },
		});

		await expect(renameGenre(genreId, "   ", USER_A)).rejects.toThrow(
			"Taxonomy name cannot be empty",
		);

		expect((await readGenreRow(genreId))?.name).toBe("Sci-Fi");
		expect(await readViewFilters(viewId)).toEqual({ genres: ["Sci-Fi"] });
	});
});

// ---------------------------------------------------------------------------
// deleteGenre
// ---------------------------------------------------------------------------

describe("deleteGenre", () => {
	it("deletes the caller's genre row", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });

		await deleteGenre(genreId, USER_A);

		expect(await readGenreRow(genreId)).toBeUndefined();
	});

	it("nulls the genre on every referencing item while the items survive", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const firstItemId = await insertItem("First", genreId);
		const secondItemId = await insertItem("Second", genreId);

		await deleteGenre(genreId, USER_A);

		expect(await readGenreIdForItem(firstItemId)).toBeNull();
		expect(await readGenreIdForItem(secondItemId)).toBeNull();
	});

	it("leaves other genres' item assignments intact", async () => {
		const deletedGenreId = await insertGenre({
			userId: USER_A,
			name: "Sci-Fi",
		});
		const keptGenreId = await insertGenre({ userId: USER_A, name: "Horror" });
		const deletedGenreItemId = await insertItem("First", deletedGenreId);
		const keptGenreItemId = await insertItem("Second", keptGenreId);

		await deleteGenre(deletedGenreId, USER_A);

		expect(await readGenreIdForItem(deletedGenreItemId)).toBeNull();
		expect(await readGenreIdForItem(keptGenreItemId)).toBe(keptGenreId);
	});

	it("deletes an unused genre without touching any item's genre", async () => {
		const unusedGenreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const usedGenreId = await insertGenre({ userId: USER_A, name: "Horror" });
		const itemId = await insertItem("First", usedGenreId);

		await deleteGenre(unusedGenreId, USER_A);

		expect(await readGenreRow(unusedGenreId)).toBeUndefined();
		expect(await readGenreIdForItem(itemId)).toBe(usedGenreId);
	});

	it("rejects a genre owned by another user and changes nothing", async () => {
		const genreId = await insertGenre({ userId: USER_B, name: "Sci-Fi" });
		const itemId = await insertItem("Theirs", genreId, USER_B);

		await expect(deleteGenre(genreId, USER_A)).rejects.toThrow(
			`Genre ${genreId} not found`,
		);

		expect((await readGenreRow(genreId))?.name).toBe("Sci-Fi");
		expect(await readGenreIdForItem(itemId)).toBe(genreId);
	});

	it("strips the name from the caller's saved view genre filters", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		await insertGenre({ userId: USER_A, name: "Horror" });
		const viewId = await insertView({
			userId: USER_A,
			filters: {
				mediaTypes: [MediaItemType.BOOK],
				sortBy: "title",
				genres: ["Sci-Fi", "Horror"],
			},
		});

		await deleteGenre(genreId, USER_A);

		expect(await readViewFilters(viewId)).toEqual({
			mediaTypes: [MediaItemType.BOOK],
			sortBy: "title",
			genres: ["Horror"],
		});
	});

	it("removes the genres key entirely when the deleted genre was the only one", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const viewId = await insertView({
			userId: USER_A,
			filters: {
				statuses: [MediaItemStatus.BACKLOG],
				genres: ["Sci-Fi"],
			},
		});

		await deleteGenre(genreId, USER_A);

		expect(await readViewFilters(viewId)).toEqual({
			statuses: [MediaItemStatus.BACKLOG],
		});
	});

	it("leaves a saved tag filter of the same name untouched", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		await insertTag({ userId: USER_A, name: "Sci-Fi" });
		const viewId = await insertView({
			userId: USER_A,
			filters: { tags: ["Sci-Fi"], genres: ["Sci-Fi"] },
		});

		await deleteGenre(genreId, USER_A);

		expect(await readViewFilters(viewId)).toEqual({ tags: ["Sci-Fi"] });
	});

	it("does not touch the provider-seeded genres in item metadata", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Dune",
			genreId,
			metadata: { genres: ["Sci-Fi"] },
		});

		await deleteGenre(genreId, USER_A);

		expect(await readGenreIdForItem(itemId)).toBeNull();
		expect(await readItemMetadata(itemId)).toEqual({ genres: ["Sci-Fi"] });
	});

	it("leaves another user's views and items alone", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const otherGenreId = await insertGenre({ userId: USER_B, name: "Sci-Fi" });
		const otherItemId = await insertItem("Theirs", otherGenreId, USER_B);
		const otherViewId = await insertView({
			userId: USER_B,
			filters: { genres: ["Sci-Fi"] },
		});

		await deleteGenre(genreId, USER_A);

		expect(await readViewFilters(otherViewId)).toEqual({ genres: ["Sci-Fi"] });
		expect(await readGenreIdForItem(otherItemId)).toBe(otherGenreId);
	});
});

// ---------------------------------------------------------------------------
// mergeGenres
// ---------------------------------------------------------------------------

describe("mergeGenres", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("repoints every item on the source onto the target and deletes the source row", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		const firstItemId = await insertItem("First", sourceId);
		const secondItemId = await insertItem("Second", sourceId);

		await mergeGenres(sourceId, targetId, USER_A);

		expect(await readGenreIdForItem(firstItemId)).toBe(targetId);
		expect(await readGenreIdForItem(secondItemId)).toBe(targetId);
		expect(await readGenreRow(sourceId)).toBeUndefined();
	});

	it("adds the item counts exactly", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		await insertItem("First", sourceId);
		await insertItem("Second", sourceId);
		await insertItem("Third", targetId);

		await mergeGenres(sourceId, targetId, USER_A);

		expect(await readUsage(USER_A)).toEqual([
			{ name: "Space Opera", itemCount: 3 },
		]);
	});

	it("leaves the items intact and never nulls genre_id", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		const firstItemId = await insertItem("First", sourceId);
		const secondItemId = await insertItem("Second", sourceId);
		const targetItemId = await insertItem("Third", targetId);

		await mergeGenres(sourceId, targetId, USER_A);

		expect(await readAllMediaItemIds()).toEqual([
			firstItemId,
			secondItemId,
			targetItemId,
		]);
		expect(await readGenreIdForItem(firstItemId)).not.toBeNull();
		expect(await readGenreIdForItem(secondItemId)).not.toBeNull();
		expect(await readGenreIdForItem(targetItemId)).not.toBeNull();
	});

	it("merges an unused source without changing the target's count", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		const itemId = await insertItem("First", targetId);

		await mergeGenres(sourceId, targetId, USER_A);

		expect(await readUsage(USER_A)).toEqual([
			{ name: "Space Opera", itemCount: 1 },
		]);
		expect(await readGenreRow(sourceId)).toBeUndefined();
		expect(await readGenreIdForItem(itemId)).toBe(targetId);
	});

	it("merges into an unused target, which inherits every item", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		await insertItem("First", sourceId);
		await insertItem("Second", sourceId);

		await mergeGenres(sourceId, targetId, USER_A);

		expect(await readUsage(USER_A)).toEqual([
			{ name: "Space Opera", itemCount: 2 },
		]);
	});

	it("does not touch metadata.genres on any relinked item", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Dune",
			genreId: sourceId,
			metadata: { genres: ["Sci-Fi"] },
		});

		await mergeGenres(sourceId, targetId, USER_A);

		expect(await readItemMetadata(itemId)).toEqual({ genres: ["Sci-Fi"] });
		expect(await readGenreIdForItem(itemId)).toBe(targetId);
	});

	it("rewrites the source name to the target in saved view filters", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		await insertGenre({ userId: USER_A, name: "Horror" });
		const viewId = await insertView({
			userId: USER_A,
			filters: { genres: ["Sci-Fi", "Horror"] },
		});

		await mergeGenres(sourceId, targetId, USER_A);

		expect(await readViewFilters(viewId)).toEqual({
			genres: ["Space Opera", "Horror"],
		});
	});

	it("de-duplicates a view that filters on both names, preserving first-seen order", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		await insertGenre({ userId: USER_A, name: "Horror" });
		const viewId = await insertView({
			userId: USER_A,
			filters: { genres: ["Space Opera", "Sci-Fi", "Horror"] },
		});

		await mergeGenres(sourceId, targetId, USER_A);

		expect(await readViewFilters(viewId)).toEqual({
			genres: ["Space Opera", "Horror"],
		});
	});

	it("leaves the sibling tags filter key untouched", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		await insertTag({ userId: USER_A, name: "Sci-Fi" });
		const viewId = await insertView({
			userId: USER_A,
			filters: {
				tags: ["Sci-Fi", "Horror"],
				genres: ["Sci-Fi", "Horror"],
			},
		});

		await mergeGenres(sourceId, targetId, USER_A);

		expect(await readViewFilters(viewId)).toEqual({
			tags: ["Sci-Fi", "Horror"],
			genres: ["Space Opera", "Horror"],
		});
	});

	it("does not touch another user's views listing the same names", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		const otherViewId = await insertView({
			userId: USER_B,
			filters: { genres: ["Sci-Fi", "Space Opera"] },
		});

		await mergeGenres(sourceId, targetId, USER_A);

		expect(await readViewFilters(otherViewId)).toEqual({
			genres: ["Sci-Fi", "Space Opera"],
		});
	});

	it("rejects merging a genre into itself and changes nothing", async () => {
		const genreId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const itemId = await insertItem("First", genreId);
		const viewId = await insertView({
			userId: USER_A,
			filters: { genres: ["Sci-Fi"] },
		});

		await expect(mergeGenres(genreId, genreId, USER_A)).rejects.toThrow(
			"Cannot merge a genre into itself",
		);

		expect((await readGenreRow(genreId))?.name).toBe("Sci-Fi");
		expect(await readGenreIdForItem(itemId)).toBe(genreId);
		expect(await readViewFilters(viewId)).toEqual({ genres: ["Sci-Fi"] });
	});

	it("rejects a source owned by another user and changes nothing", async () => {
		const sourceId = await insertGenre({ userId: USER_B, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		const otherItemId = await insertItem("Theirs", sourceId, USER_B);
		const viewId = await insertView({
			userId: USER_A,
			filters: { genres: ["Sci-Fi", "Space Opera"] },
		});

		await expect(mergeGenres(sourceId, targetId, USER_A)).rejects.toThrow(
			`Genre ${sourceId} not found`,
		);

		expect((await readGenreRow(sourceId))?.name).toBe("Sci-Fi");
		expect((await readGenreRow(targetId))?.name).toBe("Space Opera");
		expect(await readGenreIdForItem(otherItemId)).toBe(sourceId);
		expect(await readViewFilters(viewId)).toEqual({
			genres: ["Sci-Fi", "Space Opera"],
		});
	});

	it("rejects a target owned by another user and changes nothing", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_B, name: "Space Opera" });
		const itemId = await insertItem("First", sourceId);
		const viewId = await insertView({
			userId: USER_A,
			filters: { genres: ["Sci-Fi", "Space Opera"] },
		});

		await expect(mergeGenres(sourceId, targetId, USER_A)).rejects.toThrow(
			`Genre ${targetId} not found`,
		);

		expect((await readGenreRow(sourceId))?.name).toBe("Sci-Fi");
		expect((await readGenreRow(targetId))?.name).toBe("Space Opera");
		expect(await readGenreIdForItem(itemId)).toBe(sourceId);
		expect(await readViewFilters(viewId)).toEqual({
			genres: ["Sci-Fi", "Space Opera"],
		});
	});

	it("leaves another user's items and identically-named genre alone", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		const otherGenreId = await insertGenre({ userId: USER_B, name: "Sci-Fi" });
		await insertItem("Mine", sourceId);
		const otherItemId = await insertItem("Theirs", otherGenreId, USER_B);

		await mergeGenres(sourceId, targetId, USER_A);

		expect((await readGenreRow(otherGenreId))?.name).toBe("Sci-Fi");
		expect(await readGenreIdForItem(otherItemId)).toBe(otherGenreId);
	});

	it("rolls back the repoint and the delete together when the transaction fails", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		const firstItemId = await insertItem("First", sourceId);
		const secondItemId = await insertItem("Second", sourceId);
		const viewId = await insertView({
			userId: USER_A,
			filters: { genres: ["Sci-Fi", "Space Opera"] },
		});

		// The only deterministic way to fail mid-transaction — and it doubles as
		// proof that `mergeGenres` really wraps its writes in one.
		const realTransaction = testDb.transaction.bind(testDb);
		vi.spyOn(testDb, "transaction").mockImplementation((callback) =>
			realTransaction(async (transaction) => {
				await callback(transaction);
				throw new Error("forced rollback");
			}),
		);

		await expect(mergeGenres(sourceId, targetId, USER_A)).rejects.toThrow(
			"forced rollback",
		);

		expect((await readGenreRow(sourceId))?.name).toBe("Sci-Fi");
		expect(await readGenreIdForItem(firstItemId)).toBe(sourceId);
		expect(await readGenreIdForItem(secondItemId)).toBe(sourceId);
		// The view rewrite runs after the transaction, so a failed one never
		// reaches it.
		expect(await readViewFilters(viewId)).toEqual({
			genres: ["Sci-Fi", "Space Opera"],
		});
	});

	it("drops the source out of the usage list, target still ordered by name", async () => {
		const sourceId = await insertGenre({ userId: USER_A, name: "Sci-Fi" });
		const targetId = await insertGenre({ userId: USER_A, name: "Space Opera" });
		await insertGenre({ userId: USER_A, name: "Horror" });
		await insertItem("First", sourceId);

		await mergeGenres(sourceId, targetId, USER_A);

		expect(await readUsage(USER_A)).toEqual([
			{ name: "Horror", itemCount: 0 },
			{ name: "Space Opera", itemCount: 1 },
		]);
	});
});
