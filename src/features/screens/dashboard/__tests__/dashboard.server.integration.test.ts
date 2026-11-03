import { asc, eq } from "drizzle-orm";
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

import { nextUpItemOrder } from "#/database/schema";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { testDb } from "#/tests/integration/db";
import {
	insertInstance,
	insertMediaItem,
	insertNextUpItemOrder,
	insertSeries,
	insertUser,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	fetchDashboardData,
	fetchExplicitNextUpItems,
	fetchInProgressItems,
	fetchRecentlyFinishedItems,
	handleReorderNextUpItems,
} from "../dashboard.server";

const USER_A = "user-a";
const USER_B = "user-b";

/** The same external item held by both users. */
const SHARED_EXTERNAL = {
	externalId: "tmdb-438631",
	externalSource: "tmdb",
} as const;

beforeEach(() => truncateAll());

describe("fetchInProgressItems", () => {
	it("returns the caller's in-progress items with their descriptive data", async () => {
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			title: "Dune",
			coverImageUrl: "http://example.test/a.jpg",
			status: MediaItemStatus.IN_PROGRESS,
		});

		const items = await fetchInProgressItems(USER_A);

		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			title: "Dune",
			type: MediaItemType.MOVIE,
			coverImageUrl: "http://example.test/a.jpg",
		});
	});

	it("excludes another user's item sharing the same external identity", async () => {
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			title: "Mine",
			status: MediaItemStatus.IN_PROGRESS,
			...SHARED_EXTERNAL,
		});
		await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.MOVIE,
			title: "Theirs",
			status: MediaItemStatus.IN_PROGRESS,
			...SHARED_EXTERNAL,
		});

		const items = await fetchInProgressItems(USER_A);

		expect(items).toHaveLength(1);
		expect(items[0].title).toBe("Mine");
	});

	it("orders items by how recently they were started, most recent first", async () => {
		const olderStartId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Alpha",
			status: MediaItemStatus.IN_PROGRESS,
		});
		await insertInstance({
			mediaItemId: olderStartId,
			startedAt: "2024-01-01",
		});

		const newerStartId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Zeta",
			status: MediaItemStatus.IN_PROGRESS,
		});
		await insertInstance({
			mediaItemId: newerStartId,
			startedAt: "2024-06-01",
		});

		const items = await fetchInProgressItems(USER_A);

		expect(items.map((item) => item.title)).toEqual(["Zeta", "Alpha"]);
	});

	it("ranks a started item ahead of one with no unfinished instance", async () => {
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Alpha",
			status: MediaItemStatus.IN_PROGRESS,
		});

		const startedId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Zeta",
			status: MediaItemStatus.IN_PROGRESS,
		});
		await insertInstance({ mediaItemId: startedId, startedAt: "2024-01-01" });

		const items = await fetchInProgressItems(USER_A);

		expect(items.map((item) => item.title)).toEqual(["Zeta", "Alpha"]);
	});

	it("falls back to alphabetical order among items with no unfinished instance", async () => {
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Zeta",
			status: MediaItemStatus.IN_PROGRESS,
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Alpha",
			status: MediaItemStatus.IN_PROGRESS,
		});

		const items = await fetchInProgressItems(USER_A);

		expect(items.map((item) => item.title)).toEqual(["Alpha", "Zeta"]);
	});
});

/** Inside the fetcher's 30-day recency window, whenever the suite happens to run. */
function daysAgo(days: number): string {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date.toISOString().slice(0, 10);
}

describe("fetchRecentlyFinishedItems", () => {
	it("returns only the caller's completed items", async () => {
		const mine = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Mine",
			status: MediaItemStatus.COMPLETED,
			...SHARED_EXTERNAL,
		});
		const theirs = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.BOOK,
			title: "Theirs",
			status: MediaItemStatus.COMPLETED,
			...SHARED_EXTERNAL,
		});
		await insertInstance({ mediaItemId: mine, completedAt: daysAgo(3) });
		await insertInstance({ mediaItemId: theirs, completedAt: daysAgo(3) });

		const items = await fetchRecentlyFinishedItems(USER_A);

		expect(items.map((item) => item.title)).toEqual(["Mine"]);
	});
});

describe("fetchExplicitNextUpItems", () => {
	it("returns only the caller's next-up items", async () => {
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Mine",
			status: MediaItemStatus.NEXT_UP,
			...SHARED_EXTERNAL,
		});
		await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.BOOK,
			title: "Theirs",
			status: MediaItemStatus.NEXT_UP,
			...SHARED_EXTERNAL,
		});

		const items = await fetchExplicitNextUpItems(USER_A);

		expect(items.map((item) => item.title)).toEqual(["Mine"]);
	});
});

describe("fetchDashboardData", () => {
	it("assembles the three sections without leaking another user's rows", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "Trilogy",
			type: MediaItemType.MOVIE,
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			title: "Reading now",
			status: MediaItemStatus.IN_PROGRESS,
			seriesId,
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			title: "Up next",
			status: MediaItemStatus.NEXT_UP,
		});
		await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.MOVIE,
			title: "B's item",
			status: MediaItemStatus.IN_PROGRESS,
		});

		const data = await fetchDashboardData(USER_A);

		const allTitles = [
			...data.inProgressItems,
			...data.nextInSeriesItems,
			...data.recentlyFinishedItems,
		].map((item) => item.title);

		expect(allTitles).toContain("Reading now");
		expect(allTitles).toContain("Up next");
		expect(allTitles).not.toContain("B's item");
	});

	it("attaches each in-progress item's stored progressPercent", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Reading now",
			status: MediaItemStatus.IN_PROGRESS,
		});
		await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-01-01",
			progressPercent: "42",
		});

		const data = await fetchDashboardData(USER_A);

		expect(data.inProgressItems[0].progressPercent).toBe(42);
	});
});

describe("fetchDashboardData next up ordering", () => {
	it("keeps the default order when the user has never saved one", async () => {
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Zeta",
			status: MediaItemStatus.NEXT_UP,
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Alpha",
			status: MediaItemStatus.NEXT_UP,
		});

		const data = await fetchDashboardData(USER_A);

		expect(data.nextInSeriesItems.map((item) => item.title)).toEqual([
			"Alpha",
			"Zeta",
		]);
	});

	it("orders covered items by their saved position and appends the rest by default order", async () => {
		await insertUser(USER_A);
		const alpha = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Alpha",
			status: MediaItemStatus.NEXT_UP,
		});
		const zeta = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Zeta",
			status: MediaItemStatus.NEXT_UP,
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Middle",
			status: MediaItemStatus.NEXT_UP,
		});
		// Only Zeta and Alpha have a saved position — Middle has none.
		await insertNextUpItemOrder({
			userId: USER_A,
			mediaItemId: zeta,
			position: 0,
		});
		await insertNextUpItemOrder({
			userId: USER_A,
			mediaItemId: alpha,
			position: 1,
		});

		const data = await fetchDashboardData(USER_A);

		expect(data.nextInSeriesItems.map((item) => item.title)).toEqual([
			"Zeta",
			"Alpha",
			"Middle",
		]);
	});
});

// ---------------------------------------------------------------------------
// handleReorderNextUpItems
// ---------------------------------------------------------------------------

function readNextUpOrderRows(userId: string) {
	return testDb
		.select()
		.from(nextUpItemOrder)
		.where(eq(nextUpItemOrder.userId, userId))
		.orderBy(asc(nextUpItemOrder.position));
}

describe("handleReorderNextUpItems", () => {
	it("writes positions 0..n-1 in the supplied order", async () => {
		await insertUser(USER_A);
		const first = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "First",
			status: MediaItemStatus.NEXT_UP,
		});
		const second = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Second",
			status: MediaItemStatus.NEXT_UP,
		});
		const third = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Third",
			status: MediaItemStatus.NEXT_UP,
		});

		await handleReorderNextUpItems(USER_A, [third, first, second]);

		expect(await readNextUpOrderRows(USER_A)).toEqual([
			{ userId: USER_A, mediaItemId: third, position: 0 },
			{ userId: USER_A, mediaItemId: first, position: 1 },
			{ userId: USER_A, mediaItemId: second, position: 2 },
		]);
	});

	it("replaces every previous saved order for the user", async () => {
		await insertUser(USER_A);
		const first = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "First",
			status: MediaItemStatus.NEXT_UP,
		});
		const second = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Second",
			status: MediaItemStatus.NEXT_UP,
		});
		await insertNextUpItemOrder({
			userId: USER_A,
			mediaItemId: first,
			position: 0,
		});
		await insertNextUpItemOrder({
			userId: USER_A,
			mediaItemId: second,
			position: 1,
		});

		await handleReorderNextUpItems(USER_A, [second, first]);

		expect(await readNextUpOrderRows(USER_A)).toEqual([
			{ userId: USER_A, mediaItemId: second, position: 0 },
			{ userId: USER_A, mediaItemId: first, position: 1 },
		]);
	});

	it("drops the row of an id left out of the new order", async () => {
		await insertUser(USER_A);
		const kept = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Kept",
			status: MediaItemStatus.NEXT_UP,
		});
		const dropped = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Dropped",
			status: MediaItemStatus.NEXT_UP,
		});
		await insertNextUpItemOrder({
			userId: USER_A,
			mediaItemId: dropped,
			position: 0,
		});

		await handleReorderNextUpItems(USER_A, [kept]);

		const rows = await readNextUpOrderRows(USER_A);
		expect(rows.map((row) => row.mediaItemId)).toEqual([kept]);
	});

	it("rejects an order containing an item outside the caller's Next Up section and writes nothing", async () => {
		await insertUser(USER_A);
		const nextUpItem = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Up next",
			status: MediaItemStatus.NEXT_UP,
		});
		const backlogItem = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Still in backlog",
			status: MediaItemStatus.BACKLOG,
		});
		await insertNextUpItemOrder({
			userId: USER_A,
			mediaItemId: nextUpItem,
			position: 0,
		});

		await expect(
			handleReorderNextUpItems(USER_A, [nextUpItem, backlogItem]),
		).rejects.toThrow(
			"Next Up reorder included an item outside the Next Up section",
		);

		expect(await readNextUpOrderRows(USER_A)).toEqual([
			{ userId: USER_A, mediaItemId: nextUpItem, position: 0 },
		]);
	});

	it("rejects an order containing a duplicate id and writes nothing", async () => {
		await insertUser(USER_A);
		const first = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "First",
			status: MediaItemStatus.NEXT_UP,
		});
		const second = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Second",
			status: MediaItemStatus.NEXT_UP,
		});

		await expect(
			handleReorderNextUpItems(USER_A, [first, second, first]),
		).rejects.toThrow("Next Up reorder included a duplicate media item id");

		expect(await readNextUpOrderRows(USER_A)).toEqual([]);
	});

	it("never touches another user's saved order", async () => {
		await insertUser(USER_A);
		await insertUser(USER_B);
		const mine = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Mine",
			status: MediaItemStatus.NEXT_UP,
		});
		const theirs = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.BOOK,
			title: "Theirs",
			status: MediaItemStatus.NEXT_UP,
		});
		await insertNextUpItemOrder({
			userId: USER_B,
			mediaItemId: theirs,
			position: 0,
		});

		await handleReorderNextUpItems(USER_A, [mine]);

		expect(await readNextUpOrderRows(USER_B)).toEqual([
			{ userId: USER_B, mediaItemId: theirs, position: 0 },
		]);
	});
});
