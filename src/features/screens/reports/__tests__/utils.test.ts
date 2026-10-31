import { afterEach, describe, expect, it, vi } from "vitest";
import {
	applyInsightsDateRangeDefaults,
	getDefaultInsightsDateRange,
	INSIGHTS_DATE_RANGE_PRESETS,
	matchPreset,
} from "../utils";

afterEach(() => {
	vi.useRealTimers();
});

describe("getDefaultInsightsDateRange", () => {
	it("returns January 1 of the current year through today", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		expect(getDefaultInsightsDateRange()).toEqual({
			startDate: "2026-01-01",
			endDate: "2026-10-31",
		});
	});
});

describe("applyInsightsDateRangeDefaults", () => {
	it("fills in both dates from the default when neither is provided", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		expect(applyInsightsDateRangeDefaults({})).toEqual({
			startDate: "2026-01-01",
			endDate: "2026-10-31",
		});
	});

	it("keeps explicitly provided dates instead of the default", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		expect(
			applyInsightsDateRangeDefaults({
				startDate: "2025-06-01",
				endDate: "2025-06-30",
			}),
		).toEqual({ startDate: "2025-06-01", endDate: "2025-06-30" });
	});

	it("fills in only the missing side when one date is provided", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		expect(applyInsightsDateRangeDefaults({ startDate: "2025-06-01" })).toEqual(
			{ startDate: "2025-06-01", endDate: "2026-10-31" },
		);
	});
});

describe("INSIGHTS_DATE_RANGE_PRESETS", () => {
	it("computes thisMonth as the 1st of the current month through today", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		const preset = INSIGHTS_DATE_RANGE_PRESETS.find(
			(p) => p.key === "thisMonth",
		);
		expect(preset?.getRange()).toEqual({
			startDate: "2026-10-01",
			endDate: "2026-10-31",
		});
	});

	it("computes lastMonth as the full calendar month before the current one", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		const preset = INSIGHTS_DATE_RANGE_PRESETS.find(
			(p) => p.key === "lastMonth",
		);
		expect(preset?.getRange()).toEqual({
			startDate: "2026-09-01",
			endDate: "2026-09-30",
		});
	});

	it("computes last3Months as a rolling window ending today", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		const preset = INSIGHTS_DATE_RANGE_PRESETS.find(
			(p) => p.key === "last3Months",
		);
		expect(preset?.getRange()).toEqual({
			startDate: "2026-07-31",
			endDate: "2026-10-31",
		});
	});

	it("computes last6Months as a rolling window ending today", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		const preset = INSIGHTS_DATE_RANGE_PRESETS.find(
			(p) => p.key === "last6Months",
		);
		expect(preset?.getRange()).toEqual({
			startDate: "2026-05-01",
			endDate: "2026-10-31",
		});
	});

	it("computes last12Months as a rolling window ending today", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		const preset = INSIGHTS_DATE_RANGE_PRESETS.find(
			(p) => p.key === "last12Months",
		);
		expect(preset?.getRange()).toEqual({
			startDate: "2025-10-31",
			endDate: "2026-10-31",
		});
	});

	it("computes yearToDate the same as the default range", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		const preset = INSIGHTS_DATE_RANGE_PRESETS.find(
			(p) => p.key === "yearToDate",
		);
		expect(preset?.getRange()).toEqual(getDefaultInsightsDateRange());
	});
});

describe("matchPreset", () => {
	it("returns yearToDate when the range equals the default year-to-date range", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		expect(matchPreset(getDefaultInsightsDateRange())).toBe("yearToDate");
	});

	it("returns null for a range that matches no preset", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		expect(
			matchPreset({ startDate: "2020-01-01", endDate: "2020-01-15" }),
		).toBeNull();
	});
});
