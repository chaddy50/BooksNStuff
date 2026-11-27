import { describe, expect, it } from "vitest";
import { MediaItemType } from "#/lib/enums";
import { getYearToDateRange } from "../../utils.server";
import {
	resolveDrillDownDateRange,
	resolveDrillDownTypeFilter,
} from "../drilldown";

describe("resolveDrillDownTypeFilter", () => {
	it("forces Book for progress_by_month regardless of the active item type filter", () => {
		expect(
			resolveDrillDownTypeFilter("progress_by_month", [MediaItemType.MOVIE]),
		).toEqual([MediaItemType.BOOK]);
	});

	it("forces Book for progress_by_month when no filter is active", () => {
		expect(resolveDrillDownTypeFilter("progress_by_month")).toEqual([
			MediaItemType.BOOK,
		]);
	});

	it("passes through the active item type filter for other report types", () => {
		expect(
			resolveDrillDownTypeFilter("items_completed_by_month", [
				MediaItemType.MOVIE,
			]),
		).toEqual([MediaItemType.MOVIE]);
	});

	it("returns null for other report types when no filter is active", () => {
		expect(resolveDrillDownTypeFilter("items_completed_by_genre")).toBeNull();
	});

	it("returns null for other report types when the filter is an empty array", () => {
		expect(resolveDrillDownTypeFilter("avg_score_by_genre", [])).toBeNull();
	});
});

describe("resolveDrillDownDateRange", () => {
	it("uses the supplied range when both startDate and endDate are given", () => {
		expect(resolveDrillDownDateRange("2024-01-01", "2024-03-15")).toEqual({
			startDate: "2024-01-01",
			endDate: "2024-03-15",
		});
	});

	it("falls back to year-to-date when no range is given", () => {
		expect(resolveDrillDownDateRange()).toEqual(getYearToDateRange());
	});

	it("falls back to year-to-date when only startDate is given", () => {
		expect(resolveDrillDownDateRange("2024-01-01", undefined)).toEqual(
			getYearToDateRange(),
		);
	});

	it("falls back to year-to-date when only endDate is given", () => {
		expect(resolveDrillDownDateRange(undefined, "2024-03-15")).toEqual(
			getYearToDateRange(),
		);
	});
});
