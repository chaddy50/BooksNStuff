import { describe, expect, it, vi } from "vitest";
import type { ZodObject } from "zod";

vi.mock("#/features/screens/mediaItemDetails/MediaItemDetailsScreen", () => ({
	MediaItemDetailsScreen: () => null,
}));
vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	getMediaItemDetails: vi.fn(),
}));

import { Route } from "../mediaItemDetails.$mediaItemId";

describe("mediaItemDetails.$mediaItemId route validateSearch", () => {
	const validateSearch = Route.options.validateSearch as unknown as ZodObject<
		Record<string, never>
	>;

	it("accepts a recognized tab id", () => {
		expect(validateSearch.parse({ tab: "history" })).toEqual({
			tab: "history",
		});
	});

	it("resolves to undefined when no tab is given", () => {
		expect(validateSearch.parse({})).toEqual({ tab: undefined });
	});

	it("drops an unrecognized tab id instead of throwing", () => {
		expect(validateSearch.parse({ tab: "nonsense" })).toEqual({
			tab: undefined,
		});
	});
});
