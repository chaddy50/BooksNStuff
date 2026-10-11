import { describe, expect, it, vi } from "vitest";

import { fetchCurrentProgressByMediaItemId } from "../progressQuery.server";

vi.mock("#/database/index", () => ({ db: {} }));

// Build a chainable mock for db.selectDistinctOn().from().where().orderBy()
function makeSelectDistinctOnMock(resolvedValue: unknown) {
	const orderByFn = vi.fn().mockResolvedValue(resolvedValue);
	const whereFn = vi.fn(() => ({ orderBy: orderByFn }));
	const fromFn = vi.fn(() => ({ where: whereFn }));
	const selectDistinctOnFn = vi.fn(() => ({ from: fromFn }));
	return { selectDistinctOnFn, fromFn, whereFn, orderByFn };
}

describe("fetchCurrentProgressByMediaItemId", () => {
	it("returns an empty map without querying when given no media item ids", async () => {
		const { db } = await import("#/database/index");
		const selectDistinctOnFn = vi.fn();
		db.selectDistinctOn = selectDistinctOnFn;

		const result = await fetchCurrentProgressByMediaItemId([]);

		expect(result.size).toBe(0);
		expect(selectDistinctOnFn).not.toHaveBeenCalled();
	});

	it("maps each row's progressPercent by media item id", async () => {
		const { db } = await import("#/database/index");
		const { selectDistinctOnFn } = makeSelectDistinctOnMock([
			{ mediaItemId: 1, progressPercent: 55 },
			{ mediaItemId: 2, progressPercent: null },
		]);
		// @ts-expect-error — assigning to mocked module
		db.selectDistinctOn = selectDistinctOnFn;

		const result = await fetchCurrentProgressByMediaItemId([1, 2]);

		expect(result.get(1)).toBe(55);
		expect(result.get(2)).toBeNull();
	});

	it("omits media items with no unfinished instance from the map", async () => {
		const { db } = await import("#/database/index");
		const { selectDistinctOnFn } = makeSelectDistinctOnMock([
			{ mediaItemId: 1, progressPercent: 55 },
		]);
		// @ts-expect-error — assigning to mocked module
		db.selectDistinctOn = selectDistinctOnFn;

		const result = await fetchCurrentProgressByMediaItemId([1, 2]);

		expect(result.has(2)).toBe(false);
	});
});
