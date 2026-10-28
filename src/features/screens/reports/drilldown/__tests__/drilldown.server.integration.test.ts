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
	insertSeries,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	fetchDrillDownItemsForGenre,
	fetchDrillDownItemsForMonth,
} from "../drilldown.server";

const USER = "test-user";
// The same external item held by both users — impossible under the old schema.
const SHARED_EXTERNAL = {
	externalId: "shared-external-1",
	externalSource: "test",
} as const;
const OTHER_USER = "other-user";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// fetchDrillDownItemsForMonth
// ---------------------------------------------------------------------------

describe("fetchDrillDownItemsForMonth", () => {
	describe("deduplication", () => {
		it("item completed twice in the same month appears once with data from the most recent instance", async () => {
			const itemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,
			});
			await insertInstance({
				mediaItemId: itemId,
				completedAt: "2024-03-05",
				rating: "6",
			});
			await insertInstance({
				mediaItemId: itemId,
				completedAt: "2024-03-20",
				rating: "9",
			});

			const result = await fetchDrillDownItemsForMonth(USER, "2024-03");

			expect(result).toHaveLength(1);
			expect(result[0].rating).toBe(9);
			expect(result[0].completedAt).toBe("2024-03-20");
		});
	});

	describe("month scoping", () => {
		it("excludes items completed in a different month", async () => {
			const itemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,
			});
			await insertInstance({ mediaItemId: itemId, completedAt: "2024-02-15" });

			const result = await fetchDrillDownItemsForMonth(USER, "2024-03");

			expect(result).toHaveLength(0);
		});
	});

	describe("media type filter", () => {
		it("returns all types when no filter provided", async () => {
			const bookItemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,
			});
			const movieItemId = await insertMediaItem({
				type: MediaItemType.MOVIE,
				userId: USER,
			});
			await insertInstance({
				mediaItemId: bookItemId,
				completedAt: "2024-03-10",
			});
			await insertInstance({
				mediaItemId: movieItemId,
				completedAt: "2024-03-10",
			});

			const result = await fetchDrillDownItemsForMonth(USER, "2024-03");

			expect(result).toHaveLength(2);
		});

		it("filters to the specified media type only", async () => {
			const bookItemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,
			});
			const movieItemId = await insertMediaItem({
				type: MediaItemType.MOVIE,
				userId: USER,
			});
			await insertInstance({
				mediaItemId: bookItemId,
				completedAt: "2024-03-10",
			});
			await insertInstance({
				mediaItemId: movieItemId,
				completedAt: "2024-03-10",
			});

			const result = await fetchDrillDownItemsForMonth(USER, "2024-03", [
				MediaItemType.BOOK,
			]);

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe(MediaItemType.BOOK);
		});
	});

	describe("user scoping", () => {
		it("only returns items for the requesting user", async () => {
			const userItemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,
			});
			const otherItemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: OTHER_USER,
			});
			await insertInstance({
				mediaItemId: userItemId,
				completedAt: "2024-03-10",
			});
			await insertInstance({
				mediaItemId: otherItemId,
				completedAt: "2024-03-10",
			});

			const userResult = await fetchDrillDownItemsForMonth(USER, "2024-03");
			const otherResult = await fetchDrillDownItemsForMonth(
				OTHER_USER,
				"2024-03",
			);

			expect(userResult).toHaveLength(1);
			expect(otherResult).toHaveLength(1);
		});
	});

	describe("series join", () => {
		it("populates seriesName when the item belongs to a series", async () => {
			const seriesId = await insertSeries({
				userId: USER,
				type: MediaItemType.BOOK,
				name: "The Expanse",
			});
			const itemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,

				seriesId,
			});
			await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

			const result = await fetchDrillDownItemsForMonth(USER, "2024-03");

			expect(result[0].seriesName).toBe("The Expanse");
			expect(result[0].seriesId).toBe(seriesId);
		});

		it("seriesName is null when the item has no series", async () => {
			const itemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,
			});
			await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

			const result = await fetchDrillDownItemsForMonth(USER, "2024-03");

			expect(result[0].seriesName).toBeNull();
			expect(result[0].seriesId).toBeNull();
		});
	});
});

// ---------------------------------------------------------------------------
// fetchDrillDownItemsForGenre
// ---------------------------------------------------------------------------

describe("fetchDrillDownItemsForGenre", () => {
	describe("deduplication", () => {
		it("item completed twice within the date range appears once with data from the most recent instance", async () => {
			const genreId = await insertGenre({ userId: USER, name: "Fiction" });
			const itemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,

				genreId,
			});
			await insertInstance({
				mediaItemId: itemId,
				completedAt: "2024-02-10",
				rating: "5",
			});
			await insertInstance({
				mediaItemId: itemId,
				completedAt: "2024-03-10",
				rating: "8",
			});

			const result = await fetchDrillDownItemsForGenre(
				USER,
				["Fiction"],
				"2024-01-01",
				"2024-03-15",
			);

			expect(result).toHaveLength(1);
			expect(result[0].rating).toBe(8);
			expect(result[0].completedAt).toBe("2024-03-10");
		});
	});

	describe("date range", () => {
		it("excludes items completed before startDate", async () => {
			const genreId = await insertGenre({ userId: USER, name: "Fiction" });
			const itemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,

				genreId,
			});
			await insertInstance({ mediaItemId: itemId, completedAt: "2023-12-31" });

			const result = await fetchDrillDownItemsForGenre(
				USER,
				["Fiction"],
				"2024-01-01",
				"2024-03-15",
			);

			expect(result).toHaveLength(0);
		});

		it("excludes items completed after endDate", async () => {
			const genreId = await insertGenre({ userId: USER, name: "Fiction" });
			const itemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,

				genreId,
			});
			await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-16" });

			const result = await fetchDrillDownItemsForGenre(
				USER,
				["Fiction"],
				"2024-01-01",
				"2024-03-15",
			);

			expect(result).toHaveLength(0);
		});
	});

	describe("genre filter", () => {
		it("excludes items in a different genre", async () => {
			const genreId = await insertGenre({ userId: USER, name: "History" });
			const itemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,

				genreId,
			});
			await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

			const result = await fetchDrillDownItemsForGenre(
				USER,
				["Fiction"],
				"2024-01-01",
				"2024-03-15",
			);

			expect(result).toHaveLength(0);
		});

		it("excludes items with no genre", async () => {
			// No genreId
			const itemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,
			});
			await insertInstance({ mediaItemId: itemId, completedAt: "2024-03-10" });

			const result = await fetchDrillDownItemsForGenre(
				USER,
				["Fiction"],
				"2024-01-01",
				"2024-03-15",
			);

			expect(result).toHaveLength(0);
		});
	});

	describe("multiple genre names", () => {
		it("returns items from every listed genre", async () => {
			const fictionId = await insertGenre({ userId: USER, name: "Fiction" });
			const historyId = await insertGenre({ userId: USER, name: "History" });
			const poetryId = await insertGenre({ userId: USER, name: "Poetry" });
			const fictionItemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,
				genreId: fictionId,
			});
			const historyItemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,
				genreId: historyId,
			});
			const poetryItemId = await insertMediaItem({
				type: MediaItemType.BOOK,
				userId: USER,
				genreId: poetryId,
			});
			await insertInstance({
				mediaItemId: fictionItemId,
				completedAt: "2024-03-05",
			});
			await insertInstance({
				mediaItemId: historyItemId,
				completedAt: "2024-03-10",
			});
			await insertInstance({
				mediaItemId: poetryItemId,
				completedAt: "2024-03-12",
			});

			const result = await fetchDrillDownItemsForGenre(
				USER,
				["Fiction", "History"],
				"2024-01-01",
				"2024-03-15",
			);

			expect(result.map((item) => item.id).sort()).toEqual(
				[fictionItemId, historyItemId].sort(),
			);
		});
	});

	describe("media type filter", () => {
		it("filters to the specified media type only", async () => {
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
			});
			await insertInstance({
				mediaItemId: movieItemId,
				completedAt: "2024-03-10",
			});

			const result = await fetchDrillDownItemsForGenre(
				USER,
				["Fiction"],
				"2024-01-01",
				"2024-03-15",
				[MediaItemType.BOOK],
			);

			expect(result).toHaveLength(1);
			expect(result[0].type).toBe(MediaItemType.BOOK);
		});
	});

	describe("user scoping", () => {
		it("only returns items for the requesting user", async () => {
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
			});
			await insertInstance({
				mediaItemId: otherItemId,
				completedAt: "2024-03-10",
			});

			const userResult = await fetchDrillDownItemsForGenre(
				USER,
				["Fiction"],
				"2024-01-01",
				"2024-03-15",
			);
			const otherResult = await fetchDrillDownItemsForGenre(
				OTHER_USER,
				["Fiction"],
				"2024-01-01",
				"2024-03-15",
			);

			expect(userResult).toHaveLength(1);
			expect(otherResult).toHaveLength(1);
		});
	});
});

describe("cross-user isolation", () => {
	it("excludes another user's item that shares the same external identity", async () => {
		const mine = await insertMediaItem({
			userId: USER,
			type: MediaItemType.BOOK,
			title: "Mine",
			...SHARED_EXTERNAL,
		});
		const theirs = await insertMediaItem({
			userId: OTHER_USER,
			type: MediaItemType.BOOK,
			title: "Theirs",
			...SHARED_EXTERNAL,
		});
		await insertInstance({ mediaItemId: mine, completedAt: "2024-03-10" });
		await insertInstance({ mediaItemId: theirs, completedAt: "2024-03-10" });

		const result = await fetchDrillDownItemsForMonth(USER, "2024-03");

		expect(result).toHaveLength(1);
		expect(result[0].title).toBe("Mine");
	});
});
