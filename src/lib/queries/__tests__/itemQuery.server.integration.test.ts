import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";

// Redirect all db calls to the test database.
// vi.mock is hoisted before imports, so runItemQuery will see testDb.
vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { BLANK_FILTER_VALUE } from "#/lib/genres/constants";
import {
	insertCreator,
	insertGenre,
	insertInstance,
	insertMediaItem,
	insertSeries,
	insertTag,
	insertView,
	insertViewItemOrder,
	linkTag,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	runItemQuery,
	runItemStatsQuery,
	runOrderableItemQuery,
} from "../itemQuery.server";

const USER = "test-user";

beforeEach(() => truncateAll());
afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Insert a minimal metadata + media item pair and return the mediaItem id. */
async function insertItem(
	overrides: {
		type?: MediaItemType;
		title?: string;
		status?: MediaItemStatus;
		purchaseStatus?: PurchaseStatus;
		seriesId?: number;
		creatorId?: number;
		genreId?: number;
		metadata?: Record<string, unknown>;
		releaseDate?: string;
		userId?: string;
	} = {},
): Promise<number> {
	return insertMediaItem({
		type: overrides.type ?? MediaItemType.BOOK,
		title: overrides.title,
		metadata: overrides.metadata,
		releaseDate: overrides.releaseDate,
		userId: overrides.userId ?? USER,

		status: overrides.status,
		purchaseStatus: overrides.purchaseStatus,
		seriesId: overrides.seriesId,
		creatorId: overrides.creatorId,
		genreId: overrides.genreId,
	});
}

// ---------------------------------------------------------------------------
// User scoping
// ---------------------------------------------------------------------------

describe("user scoping", () => {
	it("returns only items belonging to the requesting user", async () => {
		await insertItem({ title: "Mine" });
		await insertItem({ title: "Theirs", userId: "other-user" });

		const result = await runItemQuery({}, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Mine");
	});
});

// ---------------------------------------------------------------------------
// Individual filters
// ---------------------------------------------------------------------------

describe("mediaType filter", () => {
	it("returns only items matching the requested media type", async () => {
		await insertItem({ title: "Book", type: MediaItemType.BOOK });
		await insertItem({ title: "Movie", type: MediaItemType.MOVIE });

		const result = await runItemQuery(
			{ mediaTypes: [MediaItemType.BOOK] },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Book");
	});

	it("returns all items when no mediaType filter is set", async () => {
		await insertItem({ type: MediaItemType.BOOK });
		await insertItem({ type: MediaItemType.MOVIE });

		const result = await runItemQuery({}, USER);

		expect(result.items).toHaveLength(2);
	});
});

describe("status filter", () => {
	it("returns only items with a matching status", async () => {
		await insertItem({ title: "Done", status: MediaItemStatus.COMPLETED });
		await insertItem({ title: "Queued", status: MediaItemStatus.BACKLOG });

		const result = await runItemQuery(
			{ statuses: [MediaItemStatus.COMPLETED] },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Done");
	});
});

describe("purchaseStatus filter", () => {
	it("returns only items with a matching purchase status", async () => {
		await insertItem({
			title: "Bought",
			purchaseStatus: PurchaseStatus.PURCHASED,
		});
		await insertItem({
			title: "Wishlist",
			purchaseStatus: PurchaseStatus.WANT_TO_BUY,
		});

		const result = await runItemQuery(
			{ purchaseStatuses: [PurchaseStatus.PURCHASED] },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Bought");
	});
});

describe("tag filter", () => {
	it("returns only items that have the requested tag", async () => {
		const taggedId = await insertItem({ title: "Tagged" });
		await insertItem({ title: "Untagged" });
		const tagId = await insertTag({ userId: USER, name: "favorites" });
		await linkTag(taggedId, tagId);

		const result = await runItemQuery({ tags: ["favorites"] }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Tagged");
	});

	it("does not match tags belonging to a different user", async () => {
		const itemId = await insertItem({ title: "Mine" });
		const otherTagId = await insertTag({
			userId: "other-user",
			name: "favorites",
		});
		await linkTag(itemId, otherTagId);

		// The tag exists and is linked, but it belongs to other-user
		const result = await runItemQuery({ tags: ["favorites"] }, USER);

		expect(result.items).toHaveLength(0);
	});
});

describe("blank tag filter", () => {
	it("returns only items with no tags when the sentinel is used alone", async () => {
		const taggedId = await insertItem({ title: "Tagged" });
		await insertItem({ title: "Untagged" });
		const tagId = await insertTag({ userId: USER, name: "favorites" });
		await linkTag(taggedId, tagId);

		const result = await runItemQuery({ tags: [BLANK_FILTER_VALUE] }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Untagged");
	});

	it("returns items with no tags OR the selected real tag", async () => {
		const favoritesId = await insertItem({ title: "Favorites" });
		await insertItem({ title: "Untagged" });
		const laterId = await insertItem({ title: "Later" });
		const favoritesTagId = await insertTag({ userId: USER, name: "favorites" });
		const laterTagId = await insertTag({ userId: USER, name: "later" });
		await linkTag(favoritesId, favoritesTagId);
		await linkTag(laterId, laterTagId);

		const result = await runItemQuery(
			{ tags: [BLANK_FILTER_VALUE, "favorites"] },
			USER,
		);

		const titles = result.items.map((item) => item.title).sort();
		expect(titles).toEqual(["Favorites", "Untagged"]);
	});

	it("does not match an item that has multiple tags", async () => {
		const multiTaggedId = await insertItem({ title: "Multi" });
		const tagOneId = await insertTag({ userId: USER, name: "one" });
		const tagTwoId = await insertTag({ userId: USER, name: "two" });
		await linkTag(multiTaggedId, tagOneId);
		await linkTag(multiTaggedId, tagTwoId);

		const result = await runItemQuery({ tags: [BLANK_FILTER_VALUE] }, USER);

		expect(result.items).toHaveLength(0);
	});

	it("combines with a sibling status filter", async () => {
		await insertItem({
			title: "Untagged Backlog",
			status: MediaItemStatus.BACKLOG,
		});
		await insertItem({
			title: "Untagged Done",
			status: MediaItemStatus.COMPLETED,
		});

		const result = await runItemQuery(
			{ tags: [BLANK_FILTER_VALUE], statuses: [MediaItemStatus.BACKLOG] },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Untagged Backlog");
	});
});

describe("genre filter", () => {
	it("returns only items assigned to the requested genre", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fantasy" });
		await insertItem({ title: "Fantasy Book", genreId });
		await insertItem({ title: "No Genre" });

		const result = await runItemQuery({ genres: ["Fantasy"] }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Fantasy Book");
	});
});

describe("blank genre filter", () => {
	it("returns only items with no genre when the sentinel is used alone", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fantasy" });
		await insertItem({ title: "Fantasy Book", genreId });
		await insertItem({ title: "No Genre" });

		const result = await runItemQuery({ genres: [BLANK_FILTER_VALUE] }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("No Genre");
	});

	it("returns items with no genre OR the selected real genre", async () => {
		const fantasyId = await insertGenre({ userId: USER, name: "Fantasy" });
		const sciFiId = await insertGenre({ userId: USER, name: "Sci-Fi" });
		await insertItem({ title: "Fantasy Book", genreId: fantasyId });
		await insertItem({ title: "No Genre" });
		await insertItem({ title: "Sci-Fi Book", genreId: sciFiId });

		const result = await runItemQuery(
			{ genres: [BLANK_FILTER_VALUE, "Fantasy"] },
			USER,
		);

		const titles = result.items.map((item) => item.title).sort();
		expect(titles).toEqual(["Fantasy Book", "No Genre"]);
	});

	it("combines with a sibling media type filter", async () => {
		await insertItem({ title: "No Genre Book", type: MediaItemType.BOOK });
		await insertItem({ title: "No Genre Movie", type: MediaItemType.MOVIE });

		const result = await runItemQuery(
			{ genres: [BLANK_FILTER_VALUE], mediaTypes: [MediaItemType.BOOK] },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("No Genre Book");
	});
});

describe("date range filter", () => {
	it("returns items that have an instance completed within the date range", async () => {
		const inRangeId = await insertItem({ title: "In Range" });
		const outOfRangeId = await insertItem({ title: "Out of Range" });
		await insertInstance({ mediaItemId: inRangeId, completedAt: "2025-06-15" });
		await insertInstance({
			mediaItemId: outOfRangeId,
			completedAt: "2024-12-31",
		});

		const result = await runItemQuery(
			{ completedDateStart: "2025-01-01", completedDateEnd: "2025-12-31" },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("In Range");
	});

	it("includes items completed exactly on the boundary dates", async () => {
		const itemId = await insertItem({ title: "Boundary" });
		await insertInstance({ mediaItemId: itemId, completedAt: "2025-01-01" });

		const result = await runItemQuery(
			{ completedDateStart: "2025-01-01", completedDateEnd: "2025-12-31" },
			USER,
		);

		expect(result.items).toHaveLength(1);
	});

	it("excludes items with no completed instances when a date filter is set", async () => {
		await insertItem({ title: "No Instances" });

		const result = await runItemQuery(
			{ completedDateStart: "2025-01-01" },
			USER,
		);

		expect(result.items).toHaveLength(0);
	});
});

describe("completedThisYear filter", () => {
	it("returns items completed in the current year and excludes items from prior years", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-01"));

		const thisYearId = await insertItem({ title: "This Year" });
		const lastYearId = await insertItem({ title: "Last Year" });
		await insertInstance({
			mediaItemId: thisYearId,
			completedAt: "2026-01-15",
		});
		await insertInstance({
			mediaItemId: lastYearId,
			completedAt: "2025-12-31",
		});

		const result = await runItemQuery({ completedThisYear: true }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("This Year");
	});
});

describe("titleQuery filter", () => {
	it("matches items whose title contains the query string (case-insensitive)", async () => {
		await insertItem({ title: "Dune" });
		await insertItem({ title: "Foundation" });

		const result = await runItemQuery({ titleQuery: "dun" }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Dune");
	});

	it("returns no results when nothing matches the title query", async () => {
		await insertItem({ title: "Dune" });

		const result = await runItemQuery({ titleQuery: "zzznomatch" }, USER);

		expect(result.items).toHaveLength(0);
	});

	it("matches on JSONB author field", async () => {
		await insertItem({
			title: "Some Novel",
			metadata: { author: "Brandon Sanderson" },
		});
		await insertItem({
			title: "Other Novel",
			metadata: { author: "Stephen King" },
		});

		const result = await runItemQuery({ titleQuery: "sanderson" }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Some Novel");
	});
});

describe("creatorQuery filter", () => {
	it("matches items linked to a creator whose name contains the query", async () => {
		const creatorId = await insertCreator({
			userId: USER,
			name: "Christopher Nolan",
		});
		await insertItem({
			title: "Inception",
			type: MediaItemType.MOVIE,
			creatorId,
		});
		await insertItem({ title: "Something Else", type: MediaItemType.MOVIE });

		const result = await runItemQuery({ creatorQuery: "nolan" }, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Inception");
	});
});

// ---------------------------------------------------------------------------
// Combined filters
// ---------------------------------------------------------------------------

describe("combined filters", () => {
	it("does not over-filter: an item matching all criteria appears in results", async () => {
		// Matching: BOOK + COMPLETED + tagged "favorites"
		const matchId = await insertItem({
			title: "Match",
			type: MediaItemType.BOOK,
			status: MediaItemStatus.COMPLETED,
		});
		const tagId = await insertTag({ userId: USER, name: "favorites" });
		await linkTag(matchId, tagId);

		// Non-matches that each pass one or two of the three filters
		await insertItem({
			title: "Wrong type",
			type: MediaItemType.MOVIE,
			status: MediaItemStatus.COMPLETED,
		});
		await insertItem({
			title: "Wrong status",
			type: MediaItemType.BOOK,
			status: MediaItemStatus.BACKLOG,
		});

		const result = await runItemQuery(
			{
				mediaTypes: [MediaItemType.BOOK],
				statuses: [MediaItemStatus.COMPLETED],
				tags: ["favorites"],
			},
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Match");
	});
});

// ---------------------------------------------------------------------------
// Sort fields
// ---------------------------------------------------------------------------

describe("sort by title", () => {
	it("returns items in ascending alphabetical order by sortTitle", async () => {
		await insertItem({ title: "Gamma" });
		await insertItem({ title: "Alpha" });
		await insertItem({ title: "Beta" });

		const result = await runItemQuery(
			{ sortBy: "title", sortDirection: "asc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Alpha",
			"Beta",
			"Gamma",
		]);
	});

	it("returns items in descending alphabetical order by sortTitle", async () => {
		await insertItem({ title: "Gamma" });
		await insertItem({ title: "Alpha" });
		await insertItem({ title: "Beta" });

		const result = await runItemQuery(
			{ sortBy: "title", sortDirection: "desc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Gamma",
			"Beta",
			"Alpha",
		]);
	});

	it("sorts by title ignoring leading 'The'", async () => {
		await insertItem({ title: "The Hobbit" });
		await insertItem({ title: "Dune" });

		// sortTitle for "The Hobbit" is "Hobbit", so it should come after "Dune"
		const result = await runItemQuery(
			{ sortBy: "title", sortDirection: "asc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Dune",
			"The Hobbit",
		]);
	});
});

describe("sort by status", () => {
	const STATUS_RANKING = [
		MediaItemStatus.BACKLOG,
		MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
		MediaItemStatus.ON_HOLD,
		MediaItemStatus.NEXT_UP,
		MediaItemStatus.IN_PROGRESS,
		MediaItemStatus.COMPLETED,
		MediaItemStatus.DROPPED,
	];

	/** One item per status, titled after its status so order is readable. */
	async function insertOneItemPerStatus() {
		for (const status of [...STATUS_RANKING].reverse()) {
			await insertItem({ title: status, status });
		}
	}

	it("returns waiting items ahead of on hold, next up and in progress when ascending", async () => {
		await insertOneItemPerStatus();

		const result = await runItemQuery(
			{ sortBy: "status", sortDirection: "asc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual(STATUS_RANKING);
	});

	it("reverses the ranking when descending", async () => {
		await insertOneItemPerStatus();

		const result = await runItemQuery(
			{ sortBy: "status", sortDirection: "desc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual(
			[...STATUS_RANKING].reverse(),
		);
	});

	it("falls back to title ordering within a status", async () => {
		await insertItem({
			title: "Beta",
			status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
		});
		await insertItem({
			title: "Alpha",
			status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
		});

		const result = await runItemQuery(
			{ sortBy: "status", sortDirection: "asc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual(["Alpha", "Beta"]);
	});
});

describe("sort by rating", () => {
	it("returns items sorted descending by the latest completed instance rating", async () => {
		const highId = await insertItem({ title: "High Rated" });
		const lowId = await insertItem({ title: "Low Rated" });
		await insertInstance({
			mediaItemId: highId,
			completedAt: "2025-01-01",
			rating: "4.5",
		});
		await insertInstance({
			mediaItemId: lowId,
			completedAt: "2025-01-01",
			rating: "2.0",
		});

		const result = await runItemQuery(
			{ sortBy: "rating", sortDirection: "desc" },
			USER,
		);

		expect(result.items[0].title).toBe("High Rated");
		expect(result.items[1].title).toBe("Low Rated");
	});

	it("places items with no completed instances last when sorting by rating desc", async () => {
		const ratedId = await insertItem({ title: "Rated" });
		await insertItem({ title: "Unrated" });
		await insertInstance({
			mediaItemId: ratedId,
			completedAt: "2025-01-01",
			rating: "3.0",
		});

		const result = await runItemQuery(
			{ sortBy: "rating", sortDirection: "desc" },
			USER,
		);

		expect(result.items[0].title).toBe("Rated");
		expect(result.items[1].title).toBe("Unrated");
	});
});

describe("sort by completedAt", () => {
	it("returns items sorted descending by most recent completion date", async () => {
		const recentId = await insertItem({ title: "Recent" });
		const oldId = await insertItem({ title: "Old" });
		await insertInstance({ mediaItemId: recentId, completedAt: "2025-06-01" });
		await insertInstance({ mediaItemId: oldId, completedAt: "2025-01-01" });

		const result = await runItemQuery(
			{ sortBy: "completedAt", sortDirection: "desc" },
			USER,
		);

		expect(result.items[0].title).toBe("Recent");
		expect(result.items[1].title).toBe("Old");
	});
});

describe("sort by releaseDate", () => {
	it("returns items in ascending order, oldest release first", async () => {
		await insertItem({ title: "Middle", releaseDate: "2010-06-15" });
		await insertItem({ title: "Newest", releaseDate: "2024-12-31" });
		await insertItem({ title: "Oldest", releaseDate: "1999-01-01" });

		const result = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "asc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Oldest",
			"Middle",
			"Newest",
		]);
	});

	it("returns items in descending order, newest release first", async () => {
		await insertItem({ title: "Middle", releaseDate: "2010-06-15" });
		await insertItem({ title: "Newest", releaseDate: "2024-12-31" });
		await insertItem({ title: "Oldest", releaseDate: "1999-01-01" });

		const result = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "desc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Newest",
			"Middle",
			"Oldest",
		]);
	});

	it("places items with no release date last when sorting ascending", async () => {
		await insertItem({ title: "Undated" });
		await insertItem({ title: "Dated", releaseDate: "2005-03-03" });

		const result = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "asc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Dated",
			"Undated",
		]);
	});

	it("places items with no release date last when sorting descending", async () => {
		await insertItem({ title: "Undated" });
		await insertItem({ title: "Dated", releaseDate: "2005-03-03" });

		const result = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "desc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Dated",
			"Undated",
		]);
	});

	it("ignores metadata firstPublishedAt when the release date is set", async () => {
		await insertItem({
			title: "Both",
			releaseDate: "2020-01-01",
			metadata: { firstPublishedAt: "1900-01-01" },
		});
		await insertItem({ title: "Earlier", releaseDate: "1950-01-01" });

		const result = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "asc" },
			USER,
		);

		// Ordered by 2020, not the 1900 firstPublishedAt, so "Both" sorts last.
		expect(result.items.map((item) => item.title)).toEqual(["Earlier", "Both"]);
	});

	it("places an item with neither release date nor firstPublishedAt last in both directions", async () => {
		await insertItem({ title: "Neither", metadata: {} });
		await insertItem({ title: "Dated", releaseDate: "2001-01-01" });

		const ascending = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "asc" },
			USER,
		);
		const descending = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "desc" },
			USER,
		);

		expect(ascending.items.map((item) => item.title)).toEqual([
			"Dated",
			"Neither",
		]);
		expect(descending.items.map((item) => item.title)).toEqual([
			"Dated",
			"Neither",
		]);
	});

	it("falls through to the series then title tiebreak when release dates match", async () => {
		const seriesId = await insertSeries({
			userId: USER,
			name: "Bravo Series",
			type: MediaItemType.BOOK,
		});
		await insertItem({
			title: "Second Book",
			releaseDate: "2001-01-01",
			seriesId,
			metadata: { series: "Bravo Series", seriesBookNumber: "2" },
		});
		await insertItem({
			title: "First Book",
			releaseDate: "2001-01-01",
			seriesId,
			metadata: { series: "Bravo Series", seriesBookNumber: "1" },
		});
		await insertItem({ title: "Alpha Standalone", releaseDate: "2001-01-01" });

		const result = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "asc" },
			USER,
		);

		// All three tie on release date, so bySeriesThenTitle decides: the
		// standalone's series key is its own sortTitle ("Alpha Standalone"),
		// which precedes "Bravo Series"; within the series, book 1 precedes book 2.
		expect(result.items.map((item) => item.title)).toEqual([
			"Alpha Standalone",
			"First Book",
			"Second Book",
		]);
	});

	it("orders BCE release dates before CE ones when ascending", async () => {
		await insertItem({ title: "Modern", releaseDate: "2020-01-01" });
		await insertItem({ title: "Older BCE", releaseDate: "1200-01-01 BC" });
		await insertItem({ title: "Newer BCE", releaseDate: "0800-01-01 BC" });

		const result = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "asc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Older BCE",
			"Newer BCE",
			"Modern",
		]);
	});

	it("orders BCE release dates after CE ones when descending", async () => {
		await insertItem({ title: "Modern", releaseDate: "2020-01-01" });
		await insertItem({ title: "Older BCE", releaseDate: "1200-01-01 BC" });
		await insertItem({ title: "Newer BCE", releaseDate: "0800-01-01 BC" });

		const result = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "desc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Modern",
			"Newer BCE",
			"Older BCE",
		]);
	});

	it("does not fail the query when firstPublishedAt is not a parseable date", async () => {
		await insertItem({
			title: "Malformed",
			metadata: { firstPublishedAt: "unknown" },
		});
		await insertItem({ title: "Dated", releaseDate: "2001-01-01" });

		const result = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "asc" },
			USER,
		);

		// Guards against reintroducing a metadata cast into ORDER BY: casting this
		// row's "unknown" to a date would raise and take the whole query down.
		expect(result.items.map((item) => item.title)).toEqual([
			"Dated",
			"Malformed",
		]);
	});

	it("returns only items belonging to the requesting user", async () => {
		await insertItem({ title: "Mine", releaseDate: "2001-01-01" });
		await insertItem({
			title: "Theirs",
			releaseDate: "1990-01-01",
			userId: "other-user",
		});

		const result = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "asc" },
			USER,
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].title).toBe("Mine");
	});

	it("paginates by offset while preserving release date order", async () => {
		await insertItem({ title: "Oldest", releaseDate: "1990-01-01" });
		await insertItem({ title: "Middle", releaseDate: "2000-01-01" });
		await insertItem({ title: "Newest", releaseDate: "2010-01-01" });

		const result = await runItemQuery(
			{ sortBy: "releaseDate", sortDirection: "asc" },
			USER,
			1,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Middle",
			"Newest",
		]);
		expect(result.hasMore).toBe(false);
	});

	it("leaves the series sort unchanged when release dates are present", async () => {
		const seriesId = await insertSeries({
			userId: USER,
			name: "Charlie Series",
			type: MediaItemType.BOOK,
		});
		await insertItem({
			title: "Later Entry",
			releaseDate: "2005-01-01",
			seriesId,
			metadata: { series: "Charlie Series" },
		});
		await insertItem({
			title: "Earlier Entry",
			releaseDate: "2001-01-01",
			seriesId,
			metadata: { series: "Charlie Series" },
		});

		const result = await runItemQuery(
			{ sortBy: "series", sortDirection: "asc" },
			USER,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Earlier Entry",
			"Later Entry",
		]);
	});

	it("falls through to the title tiebreak when sorting by series and everything else ties", async () => {
		const seriesId = await insertSeries({
			userId: USER,
			name: "Delta Series",
			type: MediaItemType.BOOK,
		});
		await insertItem({
			title: "Zeta Book",
			seriesId,
			metadata: { series: "Delta Series" },
		});
		await insertItem({
			title: "Alpha Book",
			seriesId,
			metadata: { series: "Delta Series" },
		});

		const ascending = await runItemQuery(
			{ sortBy: "series", sortDirection: "asc" },
			USER,
		);
		const descending = await runItemQuery(
			{ sortBy: "series", sortDirection: "desc" },
			USER,
		);

		// Both items tie on series key, book number, release date, and
		// firstPublishedAt, so the title tiebreak decides in both directions.
		expect(ascending.items.map((item) => item.title)).toEqual([
			"Alpha Book",
			"Zeta Book",
		]);
		expect(descending.items.map((item) => item.title)).toEqual([
			"Alpha Book",
			"Zeta Book",
		]);
	});
});

// ---------------------------------------------------------------------------
// LATERAL join — latest completed instance
// ---------------------------------------------------------------------------

describe("LATERAL join for latest instance", () => {
	it("returns the rating from the most recently completed instance, not the first or highest", async () => {
		const itemId = await insertItem({ title: "Re-read" });
		// First read: rating 5.0, completed earlier
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-01-01",
			rating: "5.0",
		});
		// Second read: rating 3.0, completed later — this is the "latest"
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2025-06-01",
			rating: "3.0",
		});

		const result = await runItemQuery({}, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].rating).toBe(3.0);
	});

	it("returns rating 0 for an item with no completed instances", async () => {
		const itemId = await insertItem({ title: "In Progress" });
		// Instance exists but no completedAt
		await insertInstance({ mediaItemId: itemId });

		const result = await runItemQuery({}, USER);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].rating).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Custom order
// ---------------------------------------------------------------------------

describe("sort by custom", () => {
	/** Seeds a view plus the given titles, placing the first `placedCount` of them. */
	async function seedPlacedItems(titles: string[], placedCount: number) {
		const viewId = await insertView({
			userId: USER,
			filters: { sortBy: "custom", sortDirection: "asc" },
		});

		const itemIds: number[] = [];
		for (const title of titles) {
			itemIds.push(await insertItem({ title }));
		}

		for (let position = 0; position < placedCount; position++) {
			await insertViewItemOrder({
				viewId,
				mediaItemId: itemIds[position],
				position,
			});
		}

		return { viewId, itemIds };
	}

	it("orders placed items by their saved position, overriding title order", async () => {
		const { viewId } = await seedPlacedItems(["Zebra", "Middle", "Apple"], 3);

		const result = await runItemQuery(
			{ sortBy: "custom", sortDirection: "asc" },
			USER,
			0,
			viewId,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Zebra",
			"Middle",
			"Apple",
		]);
	});

	it("sorts items with no saved position after every placed item", async () => {
		const { viewId } = await seedPlacedItems(
			["Zebra", "Middle", "Apple", "Betelgeuse"],
			2,
		);

		const result = await runItemQuery(
			{ sortBy: "custom", sortDirection: "asc" },
			USER,
			0,
			viewId,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Zebra",
			"Middle",
			"Apple",
			"Betelgeuse",
		]);
	});

	it("falls back to the title tiebreaker among unplaced items", async () => {
		const { viewId } = await seedPlacedItems(["Zulu", "Charlie", "Alpha"], 0);

		const result = await runItemQuery(
			{ sortBy: "custom", sortDirection: "asc" },
			USER,
			0,
			viewId,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Alpha",
			"Charlie",
			"Zulu",
		]);
	});

	it("reverses the placed block on desc but still puts unplaced items last", async () => {
		const { viewId } = await seedPlacedItems(
			["Zebra", "Middle", "Apple", "Betelgeuse"],
			3,
		);

		const result = await runItemQuery(
			{ sortBy: "custom", sortDirection: "desc" },
			USER,
			0,
			viewId,
		);

		expect(result.items.map((item) => item.title)).toEqual([
			"Apple",
			"Middle",
			"Zebra",
			"Betelgeuse",
		]);
	});

	it("ignores order rows that belong to a different view", async () => {
		const viewA = await insertView({
			userId: USER,
			name: "View A",
			filters: { sortBy: "custom" },
		});
		const viewB = await insertView({
			userId: USER,
			name: "View B",
			filters: { sortBy: "custom" },
		});
		const zebraId = await insertItem({ title: "Zebra" });
		await insertItem({ title: "Apple" });

		// Placed in B only — from A's perspective it is unplaced, so it sorts last.
		await insertViewItemOrder({
			viewId: viewB,
			mediaItemId: zebraId,
			position: 0,
		});

		const result = await runItemQuery(
			{ sortBy: "custom", sortDirection: "asc" },
			USER,
			0,
			viewA,
		);

		expect(result.items.map((item) => item.title)).toEqual(["Apple", "Zebra"]);
	});

	it("falls back to the default ordering when no view id is supplied", async () => {
		await seedPlacedItems(["Zebra", "Middle", "Apple"], 3);

		const withoutView = await runItemQuery({ sortBy: "custom" }, USER);
		const bySeries = await runItemQuery({ sortBy: "series" }, USER);

		expect(withoutView.items.map((item) => item.title)).toEqual(
			bySeries.items.map((item) => item.title),
		);
	});

	it("still honors the view's filters", async () => {
		const viewId = await insertView({
			userId: USER,
			filters: { sortBy: "custom" },
		});
		const tagId = await insertTag({ userId: USER, name: "Ancient Sumeria" });

		const taggedId = await insertItem({ title: "Gilgamesh" });
		await linkTag(taggedId, tagId);
		const untaggedId = await insertItem({ title: "Untagged" });

		await insertViewItemOrder({ viewId, mediaItemId: taggedId, position: 1 });
		await insertViewItemOrder({ viewId, mediaItemId: untaggedId, position: 0 });

		const result = await runItemQuery(
			{ sortBy: "custom", tags: ["Ancient Sumeria"] },
			USER,
			0,
			viewId,
		);

		expect(result.items.map((item) => item.title)).toEqual(["Gilgamesh"]);
	});

	it("paginates in stable custom order", async () => {
		const viewId = await insertView({
			userId: USER,
			filters: { sortBy: "custom" },
		});
		for (let position = 0; position < 60; position++) {
			const itemId = await insertItem({
				title: `Item ${String(position).padStart(3, "0")}`,
			});
			await insertViewItemOrder({ viewId, mediaItemId: itemId, position });
		}

		const firstPage = await runItemQuery({ sortBy: "custom" }, USER, 0, viewId);
		const secondPage = await runItemQuery(
			{ sortBy: "custom" },
			USER,
			48,
			viewId,
		);

		expect(firstPage.items).toHaveLength(48);
		expect(firstPage.hasMore).toBe(true);
		expect(secondPage.items).toHaveLength(12);
		expect(secondPage.hasMore).toBe(false);
		expect(firstPage.items[0].title).toBe("Item 000");
		expect(secondPage.items[0].title).toBe("Item 048");

		const firstPageIds = new Set(firstPage.items.map((item) => item.id));
		const overlapping = secondPage.items.filter((item) =>
			firstPageIds.has(item.id),
		);
		expect(overlapping).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// runOrderableItemQuery
// ---------------------------------------------------------------------------

describe("runOrderableItemQuery", () => {
	it("returns every matching item in one call, past a single page", async () => {
		const viewId = await insertView({
			userId: USER,
			filters: { sortBy: "custom" },
		});
		for (let position = 0; position < 60; position++) {
			const itemId = await insertItem({
				title: `Item ${String(position).padStart(3, "0")}`,
			});
			await insertViewItemOrder({ viewId, mediaItemId: itemId, position });
		}

		const result = await runOrderableItemQuery(
			{ sortBy: "custom" },
			USER,
			viewId,
		);

		expect(result).toHaveLength(60);
		expect(result[0].title).toBe("Item 000");
		expect(result.at(-1)?.title).toBe("Item 059");
	});

	it("returns only the caller's items", async () => {
		const viewId = await insertView({
			userId: USER,
			filters: { sortBy: "custom" },
		});
		await insertItem({ title: "Mine" });
		await insertItem({ title: "Theirs", userId: "other-user" });

		const result = await runOrderableItemQuery(
			{ sortBy: "custom" },
			USER,
			viewId,
		);

		expect(result.map((item) => item.title)).toEqual(["Mine"]);
	});

	it("includes filter-matching items with no saved position, last", async () => {
		const viewId = await insertView({
			userId: USER,
			filters: { sortBy: "custom" },
		});
		const placedId = await insertItem({ title: "Zebra" });
		await insertItem({ title: "Apple" });
		await insertViewItemOrder({ viewId, mediaItemId: placedId, position: 0 });

		const result = await runOrderableItemQuery(
			{ sortBy: "custom" },
			USER,
			viewId,
		);

		expect(result.map((item) => item.title)).toEqual(["Zebra", "Apple"]);
	});
});

// ---------------------------------------------------------------------------
// runItemStatsQuery — aggregate math
// ---------------------------------------------------------------------------

describe("runItemStatsQuery aggregate math", () => {
	it("counts every matching item, not just the first loaded page", async () => {
		for (let itemIndex = 0; itemIndex < 60; itemIndex++) {
			await insertItem({
				title: `Item ${String(itemIndex).padStart(3, "0")}`,
			});
		}

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.totalCount).toBe(60);
	});

	it("counts completed and dropped as separate buckets of the total", async () => {
		await insertItem({ title: "Done One", status: MediaItemStatus.COMPLETED });
		await insertItem({ title: "Done Two", status: MediaItemStatus.COMPLETED });
		await insertItem({
			title: "Done Three",
			status: MediaItemStatus.COMPLETED,
		});
		await insertItem({ title: "Queued One", status: MediaItemStatus.BACKLOG });
		await insertItem({ title: "Queued Two", status: MediaItemStatus.BACKLOG });
		await insertItem({ title: "Abandoned", status: MediaItemStatus.DROPPED });

		const stats = await runItemStatsQuery({}, USER);

		expect(stats).toMatchObject({
			totalCount: 6,
			completedCount: 3,
			droppedCount: 1,
		});
	});

	it("counts purchased items", async () => {
		await insertItem({
			title: "Bought One",
			purchaseStatus: PurchaseStatus.PURCHASED,
		});
		await insertItem({
			title: "Bought Two",
			purchaseStatus: PurchaseStatus.PURCHASED,
		});
		await insertItem({
			title: "Wishlist",
			purchaseStatus: PurchaseStatus.WANT_TO_BUY,
		});
		await insertItem({
			title: "Unowned",
			purchaseStatus: PurchaseStatus.NOT_PURCHASED,
		});

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.purchasedCount).toBe(2);
	});

	it("counts a purchased item in both the purchased and dropped buckets", async () => {
		await insertItem({
			title: "Bought and abandoned",
			purchaseStatus: PurchaseStatus.PURCHASED,
			status: MediaItemStatus.DROPPED,
		});
		await insertItem({
			title: "Bought and pending release",
			purchaseStatus: PurchaseStatus.PURCHASED,
			status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
		});

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.purchasedCount).toBe(2);
		expect(stats.droppedCount).toBe(1);
	});

	it("leaves non-done, non-dropped statuses out of both buckets", async () => {
		await insertItem({ title: "Backlog", status: MediaItemStatus.BACKLOG });
		await insertItem({ title: "Next Up", status: MediaItemStatus.NEXT_UP });
		await insertItem({
			title: "In Progress",
			status: MediaItemStatus.IN_PROGRESS,
		});
		await insertItem({ title: "On Hold", status: MediaItemStatus.ON_HOLD });
		await insertItem({
			title: "Waiting",
			status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
		});

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.totalCount).toBe(5);
		expect(stats.completedCount).toBe(0);
		expect(stats.droppedCount).toBe(0);
	});

	it("returns all zeros when nothing matches", async () => {
		const stats = await runItemStatsQuery({}, USER);

		// An aggregate over no rows still yields one row, so every count reads 0
		// rather than the query coming back empty. The average has nothing to
		// average, which is a null rather than a zero.
		expect(stats).toEqual({
			totalCount: 0,
			completedCount: 0,
			purchasedCount: 0,
			droppedCount: 0,
			averageRating: null,
		});
	});

	it("counts an item with several completed instances once", async () => {
		const itemId = await insertItem({
			title: "Re-read",
			status: MediaItemStatus.COMPLETED,
		});
		await insertInstance({ mediaItemId: itemId, completedAt: "2023-01-01" });
		await insertInstance({ mediaItemId: itemId, completedAt: "2024-01-01" });
		await insertInstance({ mediaItemId: itemId, completedAt: "2025-01-01" });

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.totalCount).toBe(1);
		expect(stats.completedCount).toBe(1);
	});

	it("counts an item carrying several selected tags once", async () => {
		const itemId = await insertItem({ title: "Multi Tagged" });
		const firstTagId = await insertTag({ userId: USER, name: "a" });
		const secondTagId = await insertTag({ userId: USER, name: "b" });
		await linkTag(itemId, firstTagId);
		await linkTag(itemId, secondTagId);

		const stats = await runItemStatsQuery({ tags: ["a", "b"] }, USER);

		expect(stats.totalCount).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// runItemStatsQuery — average rating
// ---------------------------------------------------------------------------

describe("runItemStatsQuery average rating", () => {
	/** Inserts an item whose latest completed instance carries `rating`. */
	async function insertRatedItem(
		title: string,
		rating: string,
		overrides: { userId?: string; status?: MediaItemStatus } = {},
	): Promise<number> {
		const itemId = await insertItem({
			title,
			userId: overrides.userId,
			status: overrides.status,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2025-01-01",
			rating,
		});
		return itemId;
	}

	it("averages the ratings of the items the filters select", async () => {
		await insertRatedItem("Good", "4.0");
		await insertRatedItem("Better", "5.0");

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.averageRating).toBe(4.5);
	});

	it("averages the latest completed instance, not every instance", async () => {
		const rereadId = await insertItem({ title: "Re-read" });
		await insertInstance({
			mediaItemId: rereadId,
			completedAt: "2024-01-01",
			rating: "5.0",
		});
		await insertInstance({
			mediaItemId: rereadId,
			completedAt: "2025-06-01",
			rating: "3.0",
		});
		await insertRatedItem("Read Once", "5.0");

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.averageRating).toBe(4.0);
	});

	it("leaves unrated items out of the denominator", async () => {
		await insertRatedItem("Good", "4.0");
		await insertRatedItem("Better", "5.0");
		await insertItem({ title: "Unread One" });
		await insertItem({ title: "Unread Two" });

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.totalCount).toBe(4);
		expect(stats.averageRating).toBe(4.5);
	});

	// Clearing a rating writes 0 rather than NULL, and the grid already reads 0
	// as unrated, so the average has to agree with it.
	it("excludes a rating stored as 0", async () => {
		await insertRatedItem("Rated", "4.0");
		await insertRatedItem("Rating Cleared", "0");

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.averageRating).toBe(4.0);
	});

	it("excludes a rating on an instance that was never completed", async () => {
		const inProgressId = await insertItem({ title: "In Progress" });
		await insertInstance({ mediaItemId: inProgressId, rating: "4.0" });
		await insertRatedItem("Finished", "2.0");

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.averageRating).toBe(2.0);
	});

	it("returns null when nothing in the set is rated", async () => {
		for (let itemIndex = 0; itemIndex < 5; itemIndex++) {
			await insertItem({ title: `Unrated ${itemIndex}` });
		}

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.totalCount).toBe(5);
		expect(stats.averageRating).toBeNull();
	});

	// The lateral is a LEFT JOIN of at most one row per item, so the counts it
	// sits beside have to come back untouched.
	it("does not inflate the counts with the lateral join", async () => {
		const itemId = await insertItem({
			title: "Re-read",
			status: MediaItemStatus.COMPLETED,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2023-01-01",
			rating: "1.0",
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-01-01",
			rating: "2.0",
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2025-01-01",
			rating: "5.0",
		});

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.totalCount).toBe(1);
		expect(stats.completedCount).toBe(1);
		expect(stats.averageRating).toBe(5.0);
	});

	it("averages only the items the filters keep", async () => {
		await insertRatedItem("Finished", "5.0", {
			status: MediaItemStatus.COMPLETED,
		});
		await insertRatedItem("Abandoned", "1.0", {
			status: MediaItemStatus.BACKLOG,
		});

		const stats = await runItemStatsQuery(
			{ statuses: [MediaItemStatus.COMPLETED] },
			USER,
		);

		expect(stats.averageRating).toBe(5.0);
	});

	it("ignores another user's ratings", async () => {
		await insertRatedItem("Mine", "4.0");
		await insertRatedItem("Theirs", "1.0", { userId: "other-user" });

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.averageRating).toBe(4.0);
	});

	// Rounding is the stats bar's job, so the query hands back the full value.
	it("returns the unrounded average, leaving formatting to the bar", async () => {
		await insertRatedItem("One", "4.0");
		await insertRatedItem("Two", "4.0");
		await insertRatedItem("Three", "5.0");

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.averageRating).toBeCloseTo(4.333, 3);
	});

	it("averages within a tag filter", async () => {
		const firstTaggedId = await insertRatedItem("Tagged Good", "3.0");
		const secondTaggedId = await insertRatedItem("Tagged Better", "5.0");
		await insertRatedItem("Untagged", "1.0");
		const tagId = await insertTag({ userId: USER, name: "favorites" });
		await linkTag(firstTaggedId, tagId);
		await linkTag(secondTaggedId, tagId);

		const stats = await runItemStatsQuery({ tags: ["favorites"] }, USER);

		expect(stats.totalCount).toBe(2);
		expect(stats.averageRating).toBe(4.0);
	});
});

// ---------------------------------------------------------------------------
// runItemStatsQuery — filter parity with the list query
// ---------------------------------------------------------------------------

describe("runItemStatsQuery filters", () => {
	it("scopes counts to the requesting user", async () => {
		await insertItem({ title: "Mine" });
		await insertItem({ title: "Theirs", userId: "other-user" });

		const stats = await runItemStatsQuery({}, USER);

		expect(stats.totalCount).toBe(1);
	});

	it("honors the media type filter", async () => {
		await insertItem({ title: "Book", type: MediaItemType.BOOK });
		await insertItem({ title: "Movie", type: MediaItemType.MOVIE });

		const stats = await runItemStatsQuery(
			{ mediaTypes: [MediaItemType.BOOK] },
			USER,
		);

		expect(stats.totalCount).toBe(1);
	});

	it("honors the status filter", async () => {
		await insertItem({ title: "Done", status: MediaItemStatus.COMPLETED });
		await insertItem({ title: "Queued", status: MediaItemStatus.BACKLOG });

		const stats = await runItemStatsQuery(
			{ statuses: [MediaItemStatus.COMPLETED] },
			USER,
		);

		expect(stats.totalCount).toBe(1);
		expect(stats.completedCount).toBe(stats.totalCount);
	});

	it("honors the purchase status filter", async () => {
		await insertItem({
			title: "Bought",
			purchaseStatus: PurchaseStatus.PURCHASED,
		});
		await insertItem({
			title: "Wishlist",
			purchaseStatus: PurchaseStatus.WANT_TO_BUY,
		});

		const stats = await runItemStatsQuery(
			{ purchaseStatuses: [PurchaseStatus.PURCHASED] },
			USER,
		);

		expect(stats.totalCount).toBe(1);
		expect(stats.purchasedCount).toBe(stats.totalCount);
	});

	it("honors the completed date range", async () => {
		const inRangeId = await insertItem({ title: "In Range" });
		const outOfRangeId = await insertItem({ title: "Out of Range" });
		await insertInstance({ mediaItemId: inRangeId, completedAt: "2025-06-15" });
		await insertInstance({
			mediaItemId: outOfRangeId,
			completedAt: "2024-12-31",
		});

		const stats = await runItemStatsQuery(
			{ completedDateStart: "2025-01-01", completedDateEnd: "2025-12-31" },
			USER,
		);

		expect(stats.totalCount).toBe(1);
	});

	it("honors completedThisYear", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-01"));

		const thisYearId = await insertItem({ title: "This Year" });
		const lastYearId = await insertItem({ title: "Last Year" });
		await insertInstance({
			mediaItemId: thisYearId,
			completedAt: "2026-01-15",
		});
		await insertInstance({
			mediaItemId: lastYearId,
			completedAt: "2025-12-31",
		});

		const stats = await runItemStatsQuery({ completedThisYear: true }, USER);

		expect(stats.totalCount).toBe(1);
	});

	it("honors a real tag filter", async () => {
		const taggedId = await insertItem({ title: "Tagged" });
		await insertItem({ title: "Untagged" });
		const tagId = await insertTag({ userId: USER, name: "favorites" });
		await linkTag(taggedId, tagId);

		const stats = await runItemStatsQuery({ tags: ["favorites"] }, USER);

		expect(stats.totalCount).toBe(1);
	});

	it("honors the blank tag sentinel", async () => {
		const taggedId = await insertItem({ title: "Tagged" });
		await insertItem({ title: "Untagged" });
		const tagId = await insertTag({ userId: USER, name: "favorites" });
		await linkTag(taggedId, tagId);

		const stats = await runItemStatsQuery({ tags: [BLANK_FILTER_VALUE] }, USER);

		expect(stats.totalCount).toBe(1);
	});

	it("does not count items matched via another user's tag", async () => {
		const itemId = await insertItem({ title: "Mine" });
		const otherUserTagId = await insertTag({
			userId: "other-user",
			name: "favorites",
		});
		await linkTag(itemId, otherUserTagId);

		const stats = await runItemStatsQuery({ tags: ["favorites"] }, USER);

		expect(stats.totalCount).toBe(0);
	});

	it("honors a real genre filter and the blank genre sentinel", async () => {
		const genreId = await insertGenre({ userId: USER, name: "Fantasy" });
		await insertItem({ title: "Fantasy Book", genreId });
		await insertItem({ title: "No Genre" });

		const fantasyStats = await runItemStatsQuery({ genres: ["Fantasy"] }, USER);
		const blankStats = await runItemStatsQuery(
			{ genres: [BLANK_FILTER_VALUE] },
			USER,
		);

		expect(fantasyStats.totalCount).toBe(1);
		expect(blankStats.totalCount).toBe(1);
	});

	it("honors the title query and the creator query", async () => {
		const creatorId = await insertCreator({
			userId: USER,
			name: "Christopher Nolan",
		});
		await insertItem({ title: "Dune" });
		await insertItem({ title: "Foundation" });
		await insertItem({
			title: "Inception",
			type: MediaItemType.MOVIE,
			creatorId,
		});

		const titleStats = await runItemStatsQuery({ titleQuery: "dun" }, USER);
		const creatorStats = await runItemStatsQuery(
			{ creatorQuery: "nolan" },
			USER,
		);

		expect(titleStats.totalCount).toBe(1);
		expect(creatorStats.totalCount).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// runItemStatsQuery — agreement with the list query
// ---------------------------------------------------------------------------

describe("runItemStatsQuery agreement with runItemQuery", () => {
	it("totals agree with the list query under combined filters", async () => {
		const matchId = await insertItem({
			title: "Match",
			type: MediaItemType.BOOK,
			status: MediaItemStatus.COMPLETED,
		});
		const tagId = await insertTag({ userId: USER, name: "favorites" });
		await linkTag(matchId, tagId);

		await insertItem({
			title: "Wrong type",
			type: MediaItemType.MOVIE,
			status: MediaItemStatus.COMPLETED,
		});
		await insertItem({
			title: "Wrong status",
			type: MediaItemType.BOOK,
			status: MediaItemStatus.BACKLOG,
		});

		const filters = {
			mediaTypes: [MediaItemType.BOOK],
			statuses: [MediaItemStatus.COMPLETED],
			tags: ["favorites"],
		};
		const stats = await runItemStatsQuery(filters, USER);
		const listed = await runItemQuery(filters, USER);

		expect(stats.totalCount).toBe(listed.items.length);
	});

	it("totals agree with the list query across several pages", async () => {
		for (let itemIndex = 0; itemIndex < 60; itemIndex++) {
			await insertItem({
				title: `Item ${String(itemIndex).padStart(3, "0")}`,
			});
		}

		const stats = await runItemStatsQuery({}, USER);
		const firstPage = await runItemQuery({}, USER, 0);
		const secondPage = await runItemQuery({}, USER, 48);

		expect(stats.totalCount).toBe(
			firstPage.items.length + secondPage.items.length,
		);
	});

	it("agrees with the rows the list returns on every count", async () => {
		const statuses = Object.values(MediaItemStatus);
		const purchaseStatuses = Object.values(PurchaseStatus);
		for (let itemIndex = 0; itemIndex < 21; itemIndex++) {
			await insertItem({
				title: `Item ${String(itemIndex).padStart(3, "0")}`,
				status: statuses[itemIndex % statuses.length],
				purchaseStatus: purchaseStatuses[itemIndex % purchaseStatuses.length],
			});
		}

		const stats = await runItemStatsQuery({}, USER);
		const listed = await runItemQuery({}, USER);
		const items = listed.items;

		expect(stats).toEqual({
			totalCount: items.length,
			completedCount: items.filter(
				(item) => item.status === MediaItemStatus.COMPLETED,
			).length,
			purchasedCount: items.filter(
				(item) => item.purchaseStatus === PurchaseStatus.PURCHASED,
			).length,
			droppedCount: items.filter(
				(item) => item.status === MediaItemStatus.DROPPED,
			).length,
			// None of these items were given an instance, so none of them are rated.
			averageRating: null,
		});
	});
});
