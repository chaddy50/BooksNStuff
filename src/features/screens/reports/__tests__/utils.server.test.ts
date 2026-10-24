import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("#/database/index", () => ({ db: {} }));
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { buildMonthRange, getStartDateFromMonthCount } from "../utils.server";

describe("getStartDateFromMonthCount", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("does not skip a month when today is near the end of a shorter month", () => {
		vi.setSystemTime(new Date("2024-03-31T12:00:00Z"));
		expect(getStartDateFromMonthCount(2)).toBe("2024-02-01");
	});

	it("does not skip a month when subtracting across a year boundary", () => {
		vi.setSystemTime(new Date("2024-10-31T12:00:00Z"));
		expect(getStartDateFromMonthCount(12)).toBe("2023-11-01");
	});

	it("returns the first of the current month when monthCount is 1", () => {
		vi.setSystemTime(new Date("2024-03-31T12:00:00Z"));
		expect(getStartDateFromMonthCount(1)).toBe("2024-03-01");
	});
});

describe("buildMonthRange", () => {
	describe("month range generation", () => {
		it("returns a single entry when start and end are in the same month", () => {
			expect(buildMonthRange([], "2024-03-01", "2024-03-15")).toEqual([
				{ month: "2024-03", value: 0 },
			]);
		});

		it("returns entries in ascending order from start to end", () => {
			const result = buildMonthRange([], "2024-01-01", "2024-03-15");
			expect(result.map((r) => r.month)).toEqual([
				"2024-01",
				"2024-02",
				"2024-03",
			]);
		});

		it("returns exactly 12 entries for a 12-month range", () => {
			const result = buildMonthRange([], "2023-04-01", "2024-03-15");
			expect(result).toHaveLength(12);
			expect(result[0].month).toBe("2023-04");
			expect(result[11].month).toBe("2024-03");
		});

		it("wraps correctly across a year boundary", () => {
			const result = buildMonthRange([], "2023-11-01", "2024-01-15");
			expect(result.map((r) => r.month)).toEqual([
				"2023-11",
				"2023-12",
				"2024-01",
			]);
		});

		it("formats all month keys as YYYY-MM", () => {
			for (const entry of buildMonthRange([], "2024-01-01", "2024-06-30")) {
				expect(entry.month).toMatch(/^\d{4}-\d{2}$/);
			}
		});
	});

	describe("filling in missing data", () => {
		it("fills all months with 0 when rows is empty", () => {
			expect(buildMonthRange([], "2024-01-01", "2024-03-15")).toEqual([
				{ month: "2024-01", value: 0 },
				{ month: "2024-02", value: 0 },
				{ month: "2024-03", value: 0 },
			]);
		});

		it("fills missing months with 0 and preserves the provided value", () => {
			expect(
				buildMonthRange(
					[{ month: "2024-02", value: 5 }],
					"2024-01-01",
					"2024-03-15",
				),
			).toEqual([
				{ month: "2024-01", value: 0 },
				{ month: "2024-02", value: 5 },
				{ month: "2024-03", value: 0 },
			]);
		});

		it("preserves all values when every month in the range has data", () => {
			const rows = [
				{ month: "2024-01", value: 3 },
				{ month: "2024-02", value: 7 },
				{ month: "2024-03", value: 2 },
			];
			expect(buildMonthRange(rows, "2024-01-01", "2024-03-15")).toEqual([
				{ month: "2024-01", value: 3 },
				{ month: "2024-02", value: 7 },
				{ month: "2024-03", value: 2 },
			]);
		});

		it("drops rows outside the month range", () => {
			expect(
				buildMonthRange(
					[{ month: "2023-12", value: 99 }],
					"2024-01-01",
					"2024-03-15",
				),
			).toEqual([
				{ month: "2024-01", value: 0 },
				{ month: "2024-02", value: 0 },
				{ month: "2024-03", value: 0 },
			]);
		});

		it("output length matches the number of months in the range", () => {
			expect(buildMonthRange([], "2024-01-01", "2024-03-15")).toHaveLength(3);
			expect(buildMonthRange([], "2024-01-01", "2024-06-30")).toHaveLength(6);
			expect(buildMonthRange([], "2023-04-01", "2024-03-15")).toHaveLength(12);
		});
	});
});
