import { describe, expect, it } from "vitest";
import { MediaItemType } from "#/lib/enums";
import {
	getPrimaryCreatorValue,
	getSeriesLabel,
} from "../mediaItemDetailsHeaderSubline";

describe("getPrimaryCreatorValue", () => {
	it("returns the author for a book", () => {
		expect(
			getPrimaryCreatorValue(MediaItemType.BOOK, { author: "Arkady Martine" }),
		).toBe("Arkady Martine");
	});

	it("returns the director for a movie", () => {
		expect(
			getPrimaryCreatorValue(MediaItemType.MOVIE, {
				director: "Denis Villeneuve",
			}),
		).toBe("Denis Villeneuve");
	});

	it("returns the creator for a tv show", () => {
		expect(
			getPrimaryCreatorValue(MediaItemType.TV_SHOW, {
				creator: "Vince Gilligan",
			}),
		).toBe("Vince Gilligan");
	});

	it("returns the developer for a video game", () => {
		expect(
			getPrimaryCreatorValue(MediaItemType.VIDEO_GAME, {
				developer: "FromSoftware",
			}),
		).toBe("FromSoftware");
	});

	it("returns undefined when there is no metadata", () => {
		expect(getPrimaryCreatorValue(MediaItemType.BOOK, null)).toBeUndefined();
	});

	it("returns undefined when the type's creator field is missing", () => {
		expect(getPrimaryCreatorValue(MediaItemType.BOOK, {})).toBeUndefined();
	});
});

describe("getSeriesLabel", () => {
	it("appends the book number for a book in a series", () => {
		expect(
			getSeriesLabel(
				MediaItemType.BOOK,
				{ seriesBookNumber: "1" },
				"Teixcalaan",
			),
		).toBe("Teixcalaan #1");
	});

	it("omits the book number when it is absent", () => {
		expect(getSeriesLabel(MediaItemType.BOOK, {}, "Teixcalaan")).toBe(
			"Teixcalaan",
		);
	});

	it("returns the plain series name for non-book types", () => {
		expect(
			getSeriesLabel(MediaItemType.MOVIE, { seriesBookNumber: "1" }, "Dune"),
		).toBe("Dune");
	});

	it("returns undefined when there is no series", () => {
		expect(getSeriesLabel(MediaItemType.BOOK, {}, null)).toBeUndefined();
	});
});
