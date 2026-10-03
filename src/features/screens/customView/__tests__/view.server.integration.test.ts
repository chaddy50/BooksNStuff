import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import { runItemQuery } from "#/lib/queries/itemQuery.server";

// Redirect all db calls to the test database.
// vi.mock is hoisted before imports, so the handlers will see testDb.
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
	viewItemOrder,
	views,
} from "#/database/schema";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertView,
	insertViewItemOrder,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	handleGetViewOrderItems,
	handleGetViewStats,
	handleReorderViewItems,
} from "../view.server";

const USER_A = "user-a";
const USER_B = "user-b";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertItem(
	title: string,
	userId: string = USER_A,
	overrides: {
		type?: MediaItemType;
		status?: MediaItemStatus;
		purchaseStatus?: PurchaseStatus;
	} = {},
) {
	return insertMediaItem({
		userId,
		type: overrides.type ?? MediaItemType.BOOK,
		title,
		status: overrides.status,
		purchaseStatus: overrides.purchaseStatus,
	});
}

async function readOrderRows(viewId: number) {
	return testDb
		.select()
		.from(viewItemOrder)
		.where(eq(viewItemOrder.viewId, viewId))
		.orderBy(asc(viewItemOrder.position));
}

// ---------------------------------------------------------------------------
// handleReorderViewItems
// ---------------------------------------------------------------------------

describe("handleReorderViewItems", () => {
	it("writes positions 0..n-1 in the supplied order", async () => {
		const viewId = await insertView({ userId: USER_A });
		const first = await insertItem("First");
		const second = await insertItem("Second");
		const third = await insertItem("Third");

		await handleReorderViewItems(viewId, [third, first, second], USER_A);

		expect(await readOrderRows(viewId)).toEqual([
			{ viewId, mediaItemId: third, position: 0 },
			{ viewId, mediaItemId: first, position: 1 },
			{ viewId, mediaItemId: second, position: 2 },
		]);
	});

	it("replaces every previous row for the view", async () => {
		const viewId = await insertView({ userId: USER_A });
		const first = await insertItem("First");
		const second = await insertItem("Second");
		const third = await insertItem("Third");
		await insertViewItemOrder({ viewId, mediaItemId: first, position: 0 });
		await insertViewItemOrder({ viewId, mediaItemId: second, position: 1 });
		await insertViewItemOrder({ viewId, mediaItemId: third, position: 2 });

		await handleReorderViewItems(viewId, [third, first], USER_A);

		expect(await readOrderRows(viewId)).toEqual([
			{ viewId, mediaItemId: third, position: 0 },
			{ viewId, mediaItemId: first, position: 1 },
		]);
	});

	it("drops the row of an id left out of the new order", async () => {
		const viewId = await insertView({ userId: USER_A });
		const kept = await insertItem("Kept");
		const dropped = await insertItem("Dropped");
		await insertViewItemOrder({ viewId, mediaItemId: dropped, position: 0 });

		await handleReorderViewItems(viewId, [kept], USER_A);

		const rows = await readOrderRows(viewId);
		expect(rows.map((row) => row.mediaItemId)).toEqual([kept]);
	});

	it("rejects a view owned by another user and writes nothing", async () => {
		const viewId = await insertView({ userId: USER_B });
		const itemId = await insertItem("Mine");
		await insertViewItemOrder({ viewId, mediaItemId: itemId, position: 0 });

		await expect(
			handleReorderViewItems(viewId, [itemId], USER_A),
		).rejects.toThrow(`View ${viewId} not found`);

		expect(await readOrderRows(viewId)).toEqual([
			{ viewId, mediaItemId: itemId, position: 0 },
		]);
	});

	it("rejects an order containing another user's item and writes nothing", async () => {
		const viewId = await insertView({ userId: USER_A });
		const mineFirst = await insertItem("Mine first");
		const theirs = await insertItem("Theirs", USER_B);
		const mineSecond = await insertItem("Mine second");
		await insertViewItemOrder({ viewId, mediaItemId: mineFirst, position: 0 });

		await expect(
			handleReorderViewItems(viewId, [mineFirst, theirs, mineSecond], USER_A),
		).rejects.toThrow(
			`Reorder for view ${viewId} included items outside the view`,
		);

		expect(await readOrderRows(viewId)).toEqual([
			{ viewId, mediaItemId: mineFirst, position: 0 },
		]);
	});

	it("rejects an order containing an id that does not exist", async () => {
		const viewId = await insertView({ userId: USER_A });
		const first = await insertItem("First");
		const second = await insertItem("Second");

		await expect(
			handleReorderViewItems(viewId, [first, 999_999, second], USER_A),
		).rejects.toThrow(
			`Reorder for view ${viewId} included items outside the view`,
		);

		expect(await readOrderRows(viewId)).toEqual([]);
	});

	// The reported bug: reorder mode was left open on one view while the sidebar
	// switched to another, so the grid saved the first view's items against the
	// second view's id.
	it("rejects an order built from another view's items and writes nothing", async () => {
		const bookView = await insertView({
			userId: USER_A,
			name: "Books",
			filters: { mediaTypes: [MediaItemType.BOOK] },
		});
		const movieView = await insertView({
			userId: USER_A,
			name: "Movies",
			filters: { mediaTypes: [MediaItemType.MOVIE] },
		});
		const book = await insertItem("Dune", USER_A, {
			type: MediaItemType.BOOK,
		});
		const movie = await insertItem("Arrival", USER_A, {
			type: MediaItemType.MOVIE,
		});
		await insertViewItemOrder({
			viewId: movieView,
			mediaItemId: movie,
			position: 0,
		});

		await expect(
			handleReorderViewItems(movieView, [book], USER_A),
		).rejects.toThrow(
			`Reorder for view ${movieView} included items outside the view`,
		);

		expect(await readOrderRows(movieView)).toEqual([
			{ viewId: movieView, mediaItemId: movie, position: 0 },
		]);
		expect(await readOrderRows(bookView)).toEqual([]);
	});

	it("rejects a series view, which cannot be hand-ordered", async () => {
		const viewId = await insertView({ userId: USER_A, subject: "series" });
		const itemId = await insertItem("Gilgamesh");

		await expect(
			handleReorderViewItems(viewId, [itemId], USER_A),
		).rejects.toThrow(`View ${viewId} is not an item view`);

		expect(await readOrderRows(viewId)).toEqual([]);
	});

	it("leaves another view's order rows untouched", async () => {
		const viewA = await insertView({ userId: USER_A, name: "View A" });
		const viewB = await insertView({ userId: USER_A, name: "View B" });
		const first = await insertItem("First");
		const second = await insertItem("Second");
		await insertViewItemOrder({
			viewId: viewB,
			mediaItemId: first,
			position: 0,
		});

		await handleReorderViewItems(viewA, [second, first], USER_A);

		expect(await readOrderRows(viewB)).toEqual([
			{ viewId: viewB, mediaItemId: first, position: 0 },
		]);
	});

	it("clears the view's rows when given an empty list", async () => {
		const viewId = await insertView({ userId: USER_A });
		const itemId = await insertItem("First");
		await insertViewItemOrder({ viewId, mediaItemId: itemId, position: 0 });

		await handleReorderViewItems(viewId, [], USER_A);

		expect(await readOrderRows(viewId)).toEqual([]);
	});

	// Also pins that the out-of-view check counts de-duplicated ids: comparing
	// against the raw array would reject a legitimate order with a repeat in it.
	it("de-dupes repeated ids rather than colliding on the primary key", async () => {
		const viewId = await insertView({ userId: USER_A });
		const first = await insertItem("First");
		const second = await insertItem("Second");

		await handleReorderViewItems(viewId, [first, second, first], USER_A);

		expect(await readOrderRows(viewId)).toEqual([
			{ viewId, mediaItemId: first, position: 0 },
			{ viewId, mediaItemId: second, position: 1 },
		]);
	});
});

// ---------------------------------------------------------------------------
// handleGetViewOrderItems
// ---------------------------------------------------------------------------

describe("handleGetViewOrderItems", () => {
	it("returns the view's items in saved order, unplaced last", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { sortBy: "custom", sortDirection: "asc" },
		});
		const zebra = await insertItem("Zebra");
		const middle = await insertItem("Middle");
		await insertItem("Apple");
		await insertViewItemOrder({ viewId, mediaItemId: zebra, position: 0 });
		await insertViewItemOrder({ viewId, mediaItemId: middle, position: 1 });

		const items = await handleGetViewOrderItems(viewId, USER_A);

		expect(items.map((item) => item.title)).toEqual([
			"Zebra",
			"Middle",
			"Apple",
		]);
	});

	it("rejects a view owned by another user", async () => {
		const viewId = await insertView({ userId: USER_B });

		await expect(handleGetViewOrderItems(viewId, USER_A)).rejects.toThrow(
			`View ${viewId} not found`,
		);
	});

	it("rejects a series view, which cannot be hand-ordered", async () => {
		const viewId = await insertView({ userId: USER_A, subject: "series" });

		await expect(handleGetViewOrderItems(viewId, USER_A)).rejects.toThrow(
			`View ${viewId} is not an item view`,
		);
	});
});

// ---------------------------------------------------------------------------
// handleGetViewStats
// ---------------------------------------------------------------------------

describe("handleGetViewStats", () => {
	it("returns stats over the view's saved filters", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { statuses: [MediaItemStatus.COMPLETED] },
		});
		await insertItem("Done One", USER_A, {
			status: MediaItemStatus.COMPLETED,
		});
		await insertItem("Done Two", USER_A, {
			status: MediaItemStatus.COMPLETED,
		});
		await insertItem("Queued", USER_A, { status: MediaItemStatus.BACKLOG });

		const stats = await handleGetViewStats(viewId, USER_A, undefined);

		expect(stats).toMatchObject({
			totalCount: 2,
			completedCount: 2,
		});
	});

	it("returns null for a series-subject view", async () => {
		const viewId = await insertView({ userId: USER_A, subject: "series" });

		await expect(
			handleGetViewStats(viewId, USER_A, undefined),
		).resolves.toBeNull();
	});

	it("rejects a view owned by another user", async () => {
		const viewId = await insertView({ userId: USER_B });

		await expect(handleGetViewStats(viewId, USER_A, undefined)).rejects.toThrow(
			`View ${viewId} not found`,
		);
	});

	it("rejects a view id that does not exist", async () => {
		await expect(
			handleGetViewStats(999_999, USER_A, undefined),
		).rejects.toThrow("View 999999 not found");
	});

	it("narrows the counts by the title query", async () => {
		const viewId = await insertView({ userId: USER_A });
		await insertItem("Dune");
		await insertItem("Foundation");

		const stats = await handleGetViewStats(viewId, USER_A, "dun");

		expect(stats?.totalCount).toBe(1);
	});

	it("leaves the saved filters intact when no title query is given", async () => {
		const viewId = await insertView({ userId: USER_A });
		await insertItem("Dune");
		await insertItem("Foundation");

		const stats = await handleGetViewStats(viewId, USER_A, undefined);

		expect(stats?.totalCount).toBe(2);
	});

	it("applies the title query on top of, not instead of, the saved filters", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { mediaTypes: [MediaItemType.BOOK] },
		});
		await insertItem("Dune", USER_A, { type: MediaItemType.MOVIE });
		await insertItem("Dune", USER_A, { type: MediaItemType.BOOK });
		await insertItem("Foundation", USER_A, { type: MediaItemType.BOOK });

		const stats = await handleGetViewStats(viewId, USER_A, "dune");

		expect(stats?.totalCount).toBe(1);
	});

	it("counts the whole result set past one page", async () => {
		const viewId = await insertView({ userId: USER_A });
		for (let itemIndex = 0; itemIndex < 60; itemIndex++) {
			await insertItem(`Item ${String(itemIndex).padStart(3, "0")}`);
		}

		const stats = await handleGetViewStats(viewId, USER_A, undefined);

		expect(stats?.totalCount).toBe(60);
	});

	it("counts only the requesting user's items", async () => {
		const viewId = await insertView({ userId: USER_A });
		await insertItem("Mine");
		await insertItem("Theirs", USER_B);

		const stats = await handleGetViewStats(viewId, USER_A, undefined);

		expect(stats?.totalCount).toBe(1);
	});

	it("narrows the counts by a status override", async () => {
		const viewId = await insertView({ userId: USER_A });
		await insertItem("Done", USER_A, { status: MediaItemStatus.COMPLETED });
		await insertItem("Queued", USER_A, { status: MediaItemStatus.BACKLOG });

		const stats = await handleGetViewStats(viewId, USER_A, undefined, [
			MediaItemStatus.COMPLETED,
		]);

		expect(stats?.totalCount).toBe(1);
	});

	it("narrows the counts by a purchase-status override", async () => {
		const viewId = await insertView({ userId: USER_A });
		await insertItem("Owned", USER_A, {
			purchaseStatus: PurchaseStatus.PURCHASED,
		});
		await insertItem("Wishlisted", USER_A, {
			purchaseStatus: PurchaseStatus.WANT_TO_BUY,
		});

		const stats = await handleGetViewStats(
			viewId,
			USER_A,
			undefined,
			undefined,
			[PurchaseStatus.PURCHASED],
		);

		expect(stats?.totalCount).toBe(1);
	});

	it("applies a status override on top of, not instead of, the view's other saved filters", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { mediaTypes: [MediaItemType.BOOK] },
		});
		await insertItem("Dune", USER_A, {
			type: MediaItemType.BOOK,
			status: MediaItemStatus.COMPLETED,
		});
		await insertItem("Foundation", USER_A, {
			type: MediaItemType.BOOK,
			status: MediaItemStatus.BACKLOG,
		});
		await insertItem("Arrival", USER_A, {
			type: MediaItemType.MOVIE,
			status: MediaItemStatus.COMPLETED,
		});

		const stats = await handleGetViewStats(viewId, USER_A, undefined, [
			MediaItemStatus.COMPLETED,
		]);

		expect(stats?.totalCount).toBe(1);
	});

	it("overrides the view's own saved status filter rather than combining with it", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { statuses: [MediaItemStatus.IN_PROGRESS] },
		});
		await insertItem("Done One", USER_A, {
			status: MediaItemStatus.COMPLETED,
		});
		await insertItem("Done Two", USER_A, {
			status: MediaItemStatus.COMPLETED,
		});
		await insertItem("Reading", USER_A, {
			status: MediaItemStatus.IN_PROGRESS,
		});

		const stats = await handleGetViewStats(viewId, USER_A, undefined, [
			MediaItemStatus.COMPLETED,
		]);

		expect(stats?.totalCount).toBe(2);
	});

	it("does not persist a status override into the view's saved filters", async () => {
		const viewId = await insertView({ userId: USER_A });
		await insertItem("Done", USER_A, { status: MediaItemStatus.COMPLETED });

		await handleGetViewStats(viewId, USER_A, undefined, [
			MediaItemStatus.COMPLETED,
		]);

		const [row] = await testDb
			.select({ filters: views.filters })
			.from(views)
			.where(eq(views.id, viewId));
		expect(row.filters).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// Switching a view to custom order
// ---------------------------------------------------------------------------

describe("handleReorderViewItems sort switching", () => {
	/** The view's saved filters, straight from the row. */
	async function readFilters(viewId: number) {
		const [row] = await testDb
			.select({ filters: views.filters })
			.from(views)
			.where(eq(views.id, viewId));
		return row.filters;
	}

	it("switches the view to custom order when an arrangement is saved", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { sortBy: "title", sortDirection: "desc" },
		});
		const itemId = await insertItem("Gilgamesh");

		await handleReorderViewItems(viewId, [itemId], USER_A);

		expect(await readFilters(viewId)).toMatchObject({
			sortBy: "custom",
			// Positions are stored in the order shown, so they only read back as
			// arranged when the sort runs ascending.
			sortDirection: "asc",
		});
	});

	it("leaves the view's other filters untouched", async () => {
		const viewId = await insertView({
			userId: USER_A,
			// The item has to satisfy the view's filters, or the reorder is refused
			// for holding an id the view does not contain.
			filters: { mediaTypes: [MediaItemType.BOOK], sortBy: "title" },
		});
		const itemId = await insertItem("Gilgamesh", USER_A, {
			type: MediaItemType.BOOK,
		});

		await handleReorderViewItems(viewId, [itemId], USER_A);

		expect(await readFilters(viewId)).toMatchObject({
			mediaTypes: [MediaItemType.BOOK],
			sortBy: "custom",
		});
	});

	it("leaves an already custom-ordered view's sort alone", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { sortBy: "custom", sortDirection: "desc" },
		});
		const itemId = await insertItem("Gilgamesh");

		await handleReorderViewItems(viewId, [itemId], USER_A);

		expect(await readFilters(viewId)).toMatchObject({
			sortBy: "custom",
			sortDirection: "desc",
		});
	});

	// Opening reorder mode without dragging anything must not rewrite the sort.
	it("is not triggered by merely reading the view's order", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { sortBy: "title", sortDirection: "desc" },
		});
		await insertItem("Gilgamesh");

		await handleGetViewOrderItems(viewId, USER_A);

		expect(await readFilters(viewId)).toMatchObject({
			sortBy: "title",
			sortDirection: "desc",
		});
	});

	// Refusing the ids has to leave the view completely alone: flipping its sort
	// would turn the reported bug from a wrong order into a wiped one.
	it("does not switch the view when the ids are refused", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: {
				mediaTypes: [MediaItemType.MOVIE],
				sortBy: "title",
				sortDirection: "desc",
			},
		});
		const book = await insertItem("Gilgamesh", USER_A, {
			type: MediaItemType.BOOK,
		});

		await expect(
			handleReorderViewItems(viewId, [book], USER_A),
		).rejects.toThrow();

		expect(await readFilters(viewId)).toMatchObject({
			sortBy: "title",
			sortDirection: "desc",
		});
	});

	// The whole point of the switch: without it the saved positions would be
	// written and then ignored, because the view would still sort by title.
	it("makes the saved arrangement take effect for the view", async () => {
		const viewId = await insertView({
			userId: USER_A,
			filters: { sortBy: "title", sortDirection: "asc" },
		});
		const zebra = await insertItem("Zebra");
		const apple = await insertItem("Apple");

		await handleReorderViewItems(viewId, [zebra, apple], USER_A);

		const filters = (await readFilters(viewId)) as FilterAndSortOptions;
		const result = await runItemQuery(filters, USER_A, 0, viewId);

		expect(result.items.map((item) => item.title)).toEqual(["Zebra", "Apple"]);
	});
});
