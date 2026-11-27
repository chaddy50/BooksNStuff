import { describe, expect, it } from "vitest";
import {
	formatProgressInputValue,
	isPhysicalBookFormat,
	pageNumberToPercent,
	parseProgressInputValue,
	percentToPageNumber,
	resolveEffectivePageCount,
} from "#/features/screens/mediaItemDetails/components/history/components/instance/progressInputUtils";
import { BookConsumptionMethod, MediaItemType } from "#/lib/enums";

describe("isPhysicalBookFormat", () => {
	it("is true for hardcover and paperback", () => {
		expect(isPhysicalBookFormat(BookConsumptionMethod.HARDCOVER)).toBe(true);
		expect(isPhysicalBookFormat(BookConsumptionMethod.PAPERBACK)).toBe(true);
	});

	it("is false for e-book, audiobook, or an unset method", () => {
		expect(isPhysicalBookFormat(BookConsumptionMethod.EBOOK)).toBe(false);
		expect(isPhysicalBookFormat()).toBe(false);
	});
});

describe("resolveEffectivePageCount", () => {
	it("returns the page count for a physical book with a known pageCount", () => {
		expect(
			resolveEffectivePageCount(
				MediaItemType.BOOK,
				320,
				BookConsumptionMethod.PAPERBACK,
			),
		).toBe(320);
	});

	it("falls back to percent (undefined) for an e-book even with a known pageCount", () => {
		expect(
			resolveEffectivePageCount(
				MediaItemType.BOOK,
				320,
				BookConsumptionMethod.EBOOK,
			),
		).toBeUndefined();
	});

	it("falls back to percent for a non-book media type", () => {
		expect(
			resolveEffectivePageCount(
				MediaItemType.MOVIE,
				320,
				BookConsumptionMethod.PAPERBACK,
			),
		).toBeUndefined();
	});

	it("falls back to percent when pageCount is missing", () => {
		expect(
			resolveEffectivePageCount(
				MediaItemType.BOOK,
				undefined,
				BookConsumptionMethod.PAPERBACK,
			),
		).toBeUndefined();
	});
});

describe("percent <-> page conversion", () => {
	it("round-trips a page number through percent without drifting for a large book", () => {
		const pageCount = 1200;
		const page = 837;
		const percent = Number(parseProgressInputValue(String(page), pageCount));
		expect(formatProgressInputValue(percent, pageCount)).toBe(String(page));
	});

	it("clamps a page number above pageCount to 100 percent", () => {
		expect(pageNumberToPercent(500, 320)).toBe(100);
	});

	it("clamps a negative page number to 0 percent", () => {
		expect(pageNumberToPercent(-10, 320)).toBe(0);
	});

	it("converts a percent back to the nearest whole page", () => {
		expect(percentToPageNumber(50, 321)).toBe(161);
	});
});

describe("formatProgressInputValue / parseProgressInputValue", () => {
	it("formats an empty string when progressPercent is null or undefined", () => {
		expect(formatProgressInputValue(null)).toBe("");
		expect(formatProgressInputValue(undefined)).toBe("");
	});

	it("parses an empty input as undefined (no change)", () => {
		expect(parseProgressInputValue("")).toBeUndefined();
	});

	it("parses a raw percent string to a four-decimal string when there is no page count", () => {
		expect(parseProgressInputValue("42")).toBe("42.0000");
	});
});
