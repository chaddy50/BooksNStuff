import { describe, expect, it } from "vitest";
import type { UserSettings } from "#/database/schema";
import {
	applyLibrarySortDefaults,
	applySeriesSortDefaults,
	resolveInsightsItemTypes,
} from "#/features/screens/settings/settings";

describe("applyLibrarySortDefaults", () => {
	it("uses hardcoded defaults when settings is null", () => {
		const result = applyLibrarySortDefaults({}, null);
		expect(result.sortBy).toBe("series");
		expect(result.sortDirection).toBe("asc");
	});

	it("uses settings values when set", () => {
		const settings = {
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "desc",
		} as UserSettings;
		const result = applyLibrarySortDefaults({}, settings);
		expect(result.sortBy).toBe("title");
		expect(result.sortDirection).toBe("desc");
	});

	it("falls back to hardcoded default when only sortBy is set in settings", () => {
		const settings = {
			defaultLibrarySortBy: "rating",
			defaultLibrarySortDirection: null,
		} as unknown as UserSettings;
		const result = applyLibrarySortDefaults({}, settings);
		expect(result.sortBy).toBe("rating");
		expect(result.sortDirection).toBe("asc");
	});

	it("URL param sortBy overrides settings default", () => {
		const settings = {
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "desc",
		} as UserSettings;
		const result = applyLibrarySortDefaults({ sortBy: "rating" }, settings);
		expect(result.sortBy).toBe("rating");
	});

	it("URL param sortDirection overrides settings default", () => {
		const settings = {
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "desc",
		} as UserSettings;
		const result = applyLibrarySortDefaults({ sortDirection: "asc" }, settings);
		expect(result.sortDirection).toBe("asc");
	});

	it("applies releaseDate as the library default sort", () => {
		const settings = {
			defaultLibrarySortBy: "releaseDate",
			defaultLibrarySortDirection: "desc",
		} as UserSettings;
		const result = applyLibrarySortDefaults({}, settings);
		expect(result.sortBy).toBe("releaseDate");
		expect(result.sortDirection).toBe("desc");
	});

	it("URL param sortBy overrides a releaseDate settings default", () => {
		const settings = {
			defaultLibrarySortBy: "releaseDate",
			defaultLibrarySortDirection: "desc",
		} as UserSettings;
		const result = applyLibrarySortDefaults({ sortBy: "title" }, settings);
		expect(result.sortBy).toBe("title");
	});

	it("preserves other search fields unchanged", () => {
		const result = applyLibrarySortDefaults(
			{ statuses: ["done"], mediaTypes: ["book"] },
			null,
		);
		expect(result.statuses).toEqual(["done"]);
		expect(result.mediaTypes).toEqual(["book"]);
	});
});

describe("applySeriesSortDefaults", () => {
	it("uses hardcoded defaults when settings is null", () => {
		const result = applySeriesSortDefaults({}, null);
		expect(result.sortBy).toBe("name");
		expect(result.sortDirection).toBe("asc");
	});

	it("uses settings values when set", () => {
		const settings = {
			defaultSeriesSortBy: "rating",
			defaultSeriesSortDirection: "desc",
		} as UserSettings;
		const result = applySeriesSortDefaults({}, settings);
		expect(result.sortBy).toBe("rating");
		expect(result.sortDirection).toBe("desc");
	});

	it("falls back to hardcoded default when only sortBy is set in settings", () => {
		const settings = {
			defaultSeriesSortBy: "itemCount",
			defaultSeriesSortDirection: null,
		} as unknown as UserSettings;
		const result = applySeriesSortDefaults({}, settings);
		expect(result.sortBy).toBe("itemCount");
		expect(result.sortDirection).toBe("asc");
	});

	it("URL param overrides settings default", () => {
		const settings = {
			defaultSeriesSortBy: "rating",
			defaultSeriesSortDirection: "desc",
		} as UserSettings;
		const result = applySeriesSortDefaults(
			{ sortBy: "name", sortDirection: "asc" },
			settings,
		);
		expect(result.sortBy).toBe("name");
		expect(result.sortDirection).toBe("asc");
	});
});

describe("resolveInsightsItemTypes", () => {
	it("returns an empty array when neither search nor settings has a value", () => {
		expect(resolveInsightsItemTypes({}, null)).toEqual([]);
	});

	it("uses the stored default when search has no itemTypes", () => {
		const settings = { defaultInsightsItemTypes: ["book"] } as UserSettings;
		expect(resolveInsightsItemTypes({}, settings)).toEqual(["book"]);
	});

	it("lets an explicit empty itemTypes in search override the stored default", () => {
		const settings = { defaultInsightsItemTypes: ["book"] } as UserSettings;
		expect(resolveInsightsItemTypes({ itemTypes: [] }, settings)).toEqual([]);
	});

	it("lets a non-empty itemTypes in search override the stored default", () => {
		const settings = { defaultInsightsItemTypes: ["book"] } as UserSettings;
		expect(
			resolveInsightsItemTypes({ itemTypes: ["movie"] }, settings),
		).toEqual(["movie"]);
	});
});
