import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";

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
	insertGenre,
	insertInstance,
	insertMediaItem,
	truncateAll,
} from "#/tests/integration/helpers";
import { fetchAverageScoreByGenre } from "../averageScoreByGenre.server";

const USER = "test-user";
// The same external item held by both users — impossible under the old schema.
const SHARED_EXTERNAL = {
	externalId: "shared-external-1",
	externalSource: "test",
} as const;
const OTHER_USER = "other-user";
const START = "2024-01-01";
const END = "2024-03-15";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// exclusions
// ---------------------------------------------------------------------------

describe("exclusions", () => {
	it("genres with no rated completions don't appear", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		await insertMediaItem({ type: MediaItemType.BOOK, userId: USER, genreId });
		// No instance inserted

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("items with no genre are excluded", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("items with a null rating are excluded", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });
		// No rating provided

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("items with a cleared (zero) rating are excluded", async () => {
		// The instance editor stores a cleared rating as 0, not NULL.
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-10",
			rating: "0",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("a zero-rated instance doesn't drag down a genre's average", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const ratedItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		const unratedItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		await insertInstance({
			mediaItemId: ratedItemId,
			completedAt: "2024-03-05",
			rating: "9",
		});
		await insertInstance({
			mediaItemId: unratedItemId,
			completedAt: "2024-03-10",
			rating: "0",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(9);
	});

	it("items with a null completedAt are excluded", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		await insertInstance({ mediaItemId: itemId, rating: "8" });
		// No completedAt provided

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// score averaging
// ---------------------------------------------------------------------------

describe("score averaging", () => {
	it("returns the rating for a single rated item", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(8);
	});

	it("averages ratings across multiple items in the same genre", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId1 = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		const itemId2 = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		await insertInstance({
			mediaItemId: itemId1,
			completedAt: "2024-03-05",
			rating: "6",
		});
		await insertInstance({
			mediaItemId: itemId2,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(7);
	});

	it("rounds the average to 1 decimal place", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId1 = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		const itemId2 = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		await insertInstance({
			mediaItemId: itemId1,
			completedAt: "2024-03-05",
			rating: "7",
		});
		await insertInstance({
			mediaItemId: itemId2,
			completedAt: "2024-03-10",
			rating: "8",
		});
		await insertInstance({
			mediaItemId: itemId2,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(7.7);
	});

	it("multiple genres appear separately with their own averages", async () => {
		const genreIdA = await insertGenre({ userId: USER, name: "Fiction" });
		const genreIdB = await insertGenre({ userId: USER, name: "History" });
		const itemIdA = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId: genreIdA,
		});
		const itemIdB = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId: genreIdB,
		});
		await insertInstance({
			mediaItemId: itemIdA,
			completedAt: "2024-03-05",
			rating: "9",
		});
		await insertInstance({
			mediaItemId: itemIdB,
			completedAt: "2024-03-10",
			rating: "6",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result.find((row) => row.genre === "Fiction")?.value).toBe(9);
		expect(result.find((row) => row.genre === "History")?.value).toBe(6);
	});
});

// ---------------------------------------------------------------------------
// instance counting
// ---------------------------------------------------------------------------

describe("instance counting", () => {
	it("both instances contribute when an item is completed twice", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-05",
			rating: "6",
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(7);
	});
});

// ---------------------------------------------------------------------------
// media type filter
// ---------------------------------------------------------------------------

describe("media type filter", () => {
	it("returns all types when no filter provided", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const bookItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		const movieItemId = await insertMediaItem({
			type: MediaItemType.MOVIE,
			userId: USER,

			genreId,
		});
		await insertInstance({
			mediaItemId: bookItemId,
			completedAt: "2024-03-05",
			rating: "6",
		});
		await insertInstance({
			mediaItemId: movieItemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(7);
	});

	it("filters to specified media type only", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const bookItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		const movieItemId = await insertMediaItem({
			type: MediaItemType.MOVIE,
			userId: USER,

			genreId,
		});
		await insertInstance({
			mediaItemId: bookItemId,
			completedAt: "2024-03-05",
			rating: "6",
		});
		await insertInstance({
			mediaItemId: movieItemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END, [
			MediaItemType.BOOK,
		]);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(6);
	});

	it("returns empty when no items match the type filter", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const bookItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId,
		});
		await insertInstance({
			mediaItemId: bookItemId,
			completedAt: "2024-03-05",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END, [
			MediaItemType.MOVIE,
		]);

		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// date range
// ---------------------------------------------------------------------------

describe("date range", () => {
	it("excludes items completed before the cutoff", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		// 4 months ago — outside the window
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2023-11-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("excludes future-dated items", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2025-01-01",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toHaveLength(0);
	});

	it("includes items completed within the window", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,
			genreId,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-10",
			rating: "8",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);
		const genre = result.find((row) => row.genre === "Fiction");

		expect(genre?.value).toBe(8);
	});
});

// ---------------------------------------------------------------------------
// ordering
// ---------------------------------------------------------------------------

describe("ordering", () => {
	it("returns genres ordered by average score descending", async () => {
		const genreIdA = await insertGenre({ userId: USER, name: "Fiction" });
		const genreIdB = await insertGenre({ userId: USER, name: "History" });
		const itemIdA = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId: genreIdA,
		});
		const itemIdB = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId: genreIdB,
		});
		await insertInstance({
			mediaItemId: itemIdA,
			completedAt: "2024-03-05",
			rating: "6",
		});
		await insertInstance({
			mediaItemId: itemIdB,
			completedAt: "2024-03-10",
			rating: "9",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result[0].genre).toBe("History");
		expect(result[1].genre).toBe("Fiction");
	});
});

// ---------------------------------------------------------------------------
// user scoping
// ---------------------------------------------------------------------------

describe("user scoping", () => {
	it("only returns data for the requesting user", async () => {
		const userGenreId = await insertGenre({ userId: USER, name: "Fiction" });
		const otherGenreId = await insertGenre({
			userId: OTHER_USER,
			name: "Fiction",
		});
		const userItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: USER,

			genreId: userGenreId,
		});
		const otherItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			userId: OTHER_USER,

			genreId: otherGenreId,
		});
		await insertInstance({
			mediaItemId: userItemId,
			completedAt: "2024-03-10",
			rating: "8",
		});
		await insertInstance({
			mediaItemId: otherItemId,
			completedAt: "2024-03-10",
			rating: "4",
		});

		const userResult = await fetchAverageScoreByGenre(USER, START, END);
		const otherResult = await fetchAverageScoreByGenre(OTHER_USER, START, END);

		expect(userResult.find((row) => row.genre === "Fiction")?.value).toBe(8);
		expect(otherResult.find((row) => row.genre === "Fiction")?.value).toBe(4);
	});
});

describe("cross-user isolation", () => {
	it("excludes another user's item that shares the same external identity", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fiction" });
		const otherGenreId = await insertGenre({
			userId: OTHER_USER,
			name: "Fiction",
		});
		const mine = await insertMediaItem({
			userId: USER,
			type: MediaItemType.BOOK,
			genreId,
			...SHARED_EXTERNAL,
		});
		const theirs = await insertMediaItem({
			userId: OTHER_USER,
			type: MediaItemType.BOOK,
			genreId: otherGenreId,
			...SHARED_EXTERNAL,
		});
		await insertInstance({
			mediaItemId: mine,
			completedAt: "2024-03-10",
			rating: "10",
		});
		await insertInstance({
			mediaItemId: theirs,
			completedAt: "2024-03-10",
			rating: "2",
		});

		const result = await fetchAverageScoreByGenre(USER, START, END);

		expect(result).toEqual([{ genre: "Fiction", value: 10 }]);
	});
});
