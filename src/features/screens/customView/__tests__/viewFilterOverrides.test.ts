import { describe, expect, it } from "vitest";
import { applyViewFilterOverrides } from "#/features/screens/customView/viewFilterOverrides";
import { PurchaseStatus } from "#/lib/enums";

describe("applyViewFilterOverrides", () => {
	it("lets an override on any single field replace just that field of the base filters", () => {
		const result = applyViewFilterOverrides(
			{ genres: ["Philosophy"], purchaseStatuses: [PurchaseStatus.PURCHASED] },
			{ purchaseStatuses: [PurchaseStatus.NOT_PURCHASED] },
		);

		expect(result).toEqual({
			genres: ["Philosophy"],
			purchaseStatuses: [PurchaseStatus.NOT_PURCHASED],
			titleQuery: undefined,
		});
	});

	it("falls back to the base value for a field absent from overrides", () => {
		const result = applyViewFilterOverrides({ tags: ["Fiction"] }, {});

		expect(result.tags).toEqual(["Fiction"]);
	});

	it("always takes titleQuery from overrides, even clearing it when undefined", () => {
		const result = applyViewFilterOverrides(
			{ genres: ["Philosophy"] },
			{ titleQuery: undefined },
		);

		expect(result.titleQuery).toBeUndefined();
	});

	it("takes titleQuery from overrides when provided", () => {
		const result = applyViewFilterOverrides({}, { titleQuery: "dune" });

		expect(result.titleQuery).toBe("dune");
	});

	it("treats a null base as an empty set of saved filters", () => {
		const result = applyViewFilterOverrides(null, { tags: ["Fiction"] });

		expect(result.tags).toEqual(["Fiction"]);
	});

	it("merges an override on a dimension the stats-bar click mechanism never used, like tags", () => {
		const result = applyViewFilterOverrides(
			{ purchaseStatuses: [PurchaseStatus.PURCHASED] },
			{ tags: ["Fiction"] },
		);

		expect(result).toEqual({
			purchaseStatuses: [PurchaseStatus.PURCHASED],
			tags: ["Fiction"],
			titleQuery: undefined,
		});
	});

	// A view's filter overlay can now temporarily resort it too, the same way it
	// temporarily narrows it — without touching the view's own saved sort.
	it("lets an override temporarily replace the view's saved sort", () => {
		const result = applyViewFilterOverrides(
			{ sortBy: "title", sortDirection: "asc" },
			{ sortBy: "rating", sortDirection: "desc" },
		);

		expect(result).toMatchObject({
			sortBy: "rating",
			sortDirection: "desc",
		});
	});

	it("falls back to the view's saved sort when no sort override is given", () => {
		const result = applyViewFilterOverrides(
			{ sortBy: "title", sortDirection: "asc" },
			{},
		);

		expect(result).toMatchObject({ sortBy: "title", sortDirection: "asc" });
	});
});
