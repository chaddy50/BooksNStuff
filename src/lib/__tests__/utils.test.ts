import { describe, expect, it } from "vitest";
import {
	findFirstMatchAfterIndex,
	formatDateRange,
	getLocalDateString,
	isDeepEqual,
} from "../utils";

describe("getLocalDateString", () => {
	it("formats the date using local year, month, and day", () => {
		expect(getLocalDateString(new Date(2024, 0, 15))).toBe("2024-01-15");
	});

	it("pads single-digit months and days", () => {
		expect(getLocalDateString(new Date(2024, 2, 3))).toBe("2024-03-03");
	});

	it("does not shift the date across a UTC day boundary", () => {
		// 11pm local time on Dec 31 is already Jan 1 in UTC timezones ahead of local time.
		const lateNewYearsEve = new Date(2024, 11, 31, 23, 0, 0);
		expect(getLocalDateString(lateNewYearsEve)).toBe("2024-12-31");
	});
});

describe("formatDateRange", () => {
	it("returns null when both are null", () => {
		expect(formatDateRange(null, null)).toBeNull();
	});

	it("returns null when both are undefined", () => {
		expect(formatDateRange(undefined, undefined)).toBeNull();
	});

	it("returns null when startedAt is null and completedAt is undefined", () => {
		expect(formatDateRange(null, undefined)).toBeNull();
	});

	it("returns a single date when startedAt and completedAt are the same", () => {
		expect(formatDateRange("2024-01-15", "2024-01-15")).toBe("Jan 15, 2024");
	});

	it("returns a date range when both dates are set and different", () => {
		expect(formatDateRange("2024-01-01", "2024-06-15")).toBe(
			"Jan 01, 2024 – Jun 15, 2024",
		);
	});

	it("returns 'Started {date}' when only startedAt is set", () => {
		expect(formatDateRange("2024-01-01", null)).toBe("Started Jan 01, 2024");
	});

	it("returns just the end date when only completedAt is set", () => {
		expect(formatDateRange(null, "2024-06-15")).toBe("Jun 15, 2024");
	});
});

describe("findFirstMatchAfterIndex", () => {
	it("returns the first matching item after the given index", () => {
		const items = [1, 2, 3, 4, 5];
		expect(findFirstMatchAfterIndex(items, 1, (item) => item > 2)).toBe(3);
	});

	it("returns undefined when no item after the index matches", () => {
		const items = [1, 2, 3];
		expect(
			findFirstMatchAfterIndex(items, 1, (item) => item > 10),
		).toBeUndefined();
	});

	it("searches the whole array when the index is -1", () => {
		const items = [1, 2, 3];
		expect(findFirstMatchAfterIndex(items, -1, (item) => item === 1)).toBe(1);
	});
});

describe("isDeepEqual", () => {
	it("returns true for equal primitives of the same type", () => {
		expect(isDeepEqual(1, 1)).toBe(true);
		expect(isDeepEqual("a", "a")).toBe(true);
		expect(isDeepEqual(true, true)).toBe(true);
	});

	it("returns false for unequal primitives", () => {
		expect(isDeepEqual(1, 2)).toBe(false);
		expect(isDeepEqual("a", "b")).toBe(false);
	});

	it("returns false for primitives of differing type", () => {
		expect(isDeepEqual(1, "1")).toBe(false);
		expect(isDeepEqual(0, false)).toBe(false);
		expect(isDeepEqual("", null)).toBe(false);
	});

	it("returns true for null vs null and undefined vs undefined", () => {
		expect(isDeepEqual(null, null)).toBe(true);
		expect(isDeepEqual(undefined, undefined)).toBe(true);
	});

	it("returns false for null vs undefined", () => {
		expect(isDeepEqual(null, undefined)).toBe(false);
	});

	it("returns false when comparing null against an object in either direction", () => {
		expect(isDeepEqual(null, {})).toBe(false);
		expect(isDeepEqual({}, null)).toBe(false);
	});

	it("returns true for arrays with identical elements in the same order", () => {
		expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
	});

	it("returns false for arrays with the same elements in a different order", () => {
		expect(isDeepEqual([1, 2], [2, 1])).toBe(false);
	});

	it("returns false for arrays of differing length", () => {
		expect(isDeepEqual([1, 2], [1, 2, 3])).toBe(false);
	});

	it("returns false when comparing an array against a plain object", () => {
		expect(isDeepEqual([], {})).toBe(false);
	});

	it("returns true for plain objects whose keys were inserted in a different order", () => {
		expect(isDeepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
	});

	it("returns false for plain objects with differing key counts in either direction", () => {
		expect(isDeepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		expect(isDeepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
	});

	it("compares nested objects and arrays matching the instance form baseline shape", () => {
		const baseline = {
			rating: 4.5,
			fictionRating: { setting: 4, character: 5, plot: 4 },
			seasonReviews: [
				{ season: 1, startedAt: "2024-01-01", completedAt: "", rating: 4 },
			],
			consumptionInfo: { method: "audiobook", controlMethod: null },
		};
		const identical = {
			rating: 4.5,
			fictionRating: { setting: 4, character: 5, plot: 4 },
			seasonReviews: [
				{ season: 1, startedAt: "2024-01-01", completedAt: "", rating: 4 },
			],
			consumptionInfo: { method: "audiobook", controlMethod: null },
		};
		const oneNestedLeafChanged = {
			...identical,
			seasonReviews: [
				{ season: 1, startedAt: "2024-01-02", completedAt: "", rating: 4 },
			],
		};

		expect(isDeepEqual(baseline, identical)).toBe(true);
		expect(isDeepEqual(baseline, oneNestedLeafChanged)).toBe(false);
	});

	it("treats a key holding undefined as different from an absent key", () => {
		expect(isDeepEqual({ a: undefined }, {})).toBe(false);
	});
});
