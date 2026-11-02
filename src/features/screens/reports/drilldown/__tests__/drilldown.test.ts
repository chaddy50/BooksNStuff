import { describe, expect, it } from "vitest";
import { MediaItemType } from "#/lib/enums";
import { resolveDrillDownTypeFilter } from "../drilldown";

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
