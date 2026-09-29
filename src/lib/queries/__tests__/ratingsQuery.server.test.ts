import { describe, expect, it, vi } from "vitest";

import { fetchLatestRatingsByMediaItemId } from "../ratingsQuery.server";

vi.mock("#/database/index", () => ({ db: {} }));

// Build a chainable mock for db.selectDistinctOn().from().where().orderBy()
function makeSelectDistinctOnMock(resolvedValue: unknown) {
	const orderByFn = vi.fn().mockResolvedValue(resolvedValue);
	const whereFn = vi.fn(() => ({ orderBy: orderByFn }));
	const fromFn = vi.fn(() => ({ where: whereFn }));
	const selectDistinctOnFn = vi.fn(() => ({ from: fromFn }));
	return { selectDistinctOnFn, fromFn, whereFn, orderByFn };
}

describe("fetchLatestRatingsByMediaItemId", () => {
	it("returns an empty map without querying when given no media item ids", async () => {
		const { db } = await import("#/database/index");
		const selectDistinctOnFn = vi.fn();
		db.selectDistinctOn = selectDistinctOnFn;

		const result = await fetchLatestRatingsByMediaItemId([]);

		expect(result.size).toBe(0);
		expect(selectDistinctOnFn).not.toHaveBeenCalled();
	});

	it("maps each row's rating and completedAt by media item id", async () => {
		const { db } = await import("#/database/index");
		const { selectDistinctOnFn } = makeSelectDistinctOnMock([
			{ mediaItemId: 1, rating: "4.5", completedAt: "2024-01-01" },
			{ mediaItemId: 2, rating: null, completedAt: "2024-02-01" },
		]);
		// @ts-expect-error — assigning to mocked module
		db.selectDistinctOn = selectDistinctOnFn;

		const result = await fetchLatestRatingsByMediaItemId([1, 2]);

		expect(result.get(1)).toEqual({ rating: 4.5, completedAt: "2024-01-01" });
		expect(result.get(2)).toEqual({ rating: 0, completedAt: "2024-02-01" });
	});

	it("omits media items with no completed instance from the map", async () => {
		const { db } = await import("#/database/index");
		const { selectDistinctOnFn } = makeSelectDistinctOnMock([
			{ mediaItemId: 1, rating: "3.0", completedAt: "2024-01-01" },
		]);
		// @ts-expect-error — assigning to mocked module
		db.selectDistinctOn = selectDistinctOnFn;

		const result = await fetchLatestRatingsByMediaItemId([1, 2]);

		expect(result.has(2)).toBe(false);
	});
});
