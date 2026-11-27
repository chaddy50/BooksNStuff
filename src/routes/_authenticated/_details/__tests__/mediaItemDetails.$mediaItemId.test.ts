import { describe, expect, it, vi } from "vitest";

vi.mock("#/features/screens/mediaItemDetails/MediaItemDetailsScreen", () => ({
	MediaItemDetailsScreen: () => null,
}));
vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	getMediaItemDetails: vi.fn(),
}));

import { Route } from "../mediaItemDetails.$mediaItemId";

describe("mediaItemDetails.$mediaItemId route", () => {
	it("has no search param validation, so a stray tab query param has no special effect", () => {
		expect(Route.options.validateSearch).toBeUndefined();
	});
});
