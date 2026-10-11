import { describe, expect, it } from "vitest";

import { deriveCreatorRole, resolveCreatorName } from "../creator";

describe("resolveCreatorName", () => {
	it("returns author for books", () => {
		expect(resolveCreatorName("book", { author: "Frank Herbert" })).toBe(
			"Frank Herbert",
		);
	});

	it("returns director for movies", () => {
		expect(resolveCreatorName("movie", { director: "Denis Villeneuve" })).toBe(
			"Denis Villeneuve",
		);
	});

	it("returns creator for tv shows", () => {
		expect(resolveCreatorName("tv_show", { creator: "Vince Gilligan" })).toBe(
			"Vince Gilligan",
		);
	});

	it("returns creator for podcasts", () => {
		expect(resolveCreatorName("podcast", { creator: "Joe Rogan" })).toBe(
			"Joe Rogan",
		);
	});

	it("returns developer for video games", () => {
		expect(
			resolveCreatorName("video_game", { developer: "FromSoftware" }),
		).toBe("FromSoftware");
	});

	it("returns null when the expected field is missing", () => {
		expect(resolveCreatorName("book", { director: "someone" })).toBeNull();
	});

	it("returns null when the expected field is not a string", () => {
		expect(resolveCreatorName("book", { author: 42 })).toBeNull();
	});
});

describe("deriveCreatorRole", () => {
	it("returns null for a creator with no items", () => {
		expect(deriveCreatorRole([])).toBeNull();
	});

	it("returns author for a creator whose items are all books", () => {
		expect(deriveCreatorRole(["book", "book"])).toBe("author");
	});

	it("returns the majority role for a mixed set of items", () => {
		expect(deriveCreatorRole(["movie", "movie", "book"])).toBe("director");
	});

	it("breaks a tie by the author/director/creator/developer priority order", () => {
		expect(deriveCreatorRole(["movie", "book"])).toBe("author");
	});
});
