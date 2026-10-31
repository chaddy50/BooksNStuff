import { getLocalDateString } from "#/lib/utils";
import type { InsightsDateRange } from "./types";

export function getDefaultInsightsDateRange(): InsightsDateRange {
	const today = new Date();
	const startOfYear = new Date(today.getFullYear(), 0, 1);
	return {
		startDate: getLocalDateString(startOfYear),
		endDate: getLocalDateString(today),
	};
}

export function applyInsightsDateRangeDefaults(search: {
	startDate?: string;
	endDate?: string;
}): InsightsDateRange {
	const defaults = getDefaultInsightsDateRange();
	return {
		startDate: search.startDate ?? defaults.startDate,
		endDate: search.endDate ?? defaults.endDate,
	};
}

export type InsightsDateRangePresetKey =
	| "thisMonth"
	| "lastMonth"
	| "last3Months"
	| "last6Months"
	| "last12Months"
	| "yearToDate";

type InsightsDateRangePreset = {
	key: InsightsDateRangePresetKey;
	getRange: () => InsightsDateRange;
};

function getRollingMonthsRange(monthsBack: number): InsightsDateRange {
	const today = new Date();
	const start = new Date(today);
	start.setMonth(start.getMonth() - monthsBack);
	return {
		startDate: getLocalDateString(start),
		endDate: getLocalDateString(today),
	};
}

export const INSIGHTS_DATE_RANGE_PRESETS: readonly InsightsDateRangePreset[] = [
	{
		key: "thisMonth",
		getRange: () => {
			const today = new Date();
			const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
			return {
				startDate: getLocalDateString(startOfMonth),
				endDate: getLocalDateString(today),
			};
		},
	},
	{
		key: "lastMonth",
		getRange: () => {
			const today = new Date();
			const startOfLastMonth = new Date(
				today.getFullYear(),
				today.getMonth() - 1,
				1,
			);
			const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
			return {
				startDate: getLocalDateString(startOfLastMonth),
				endDate: getLocalDateString(endOfLastMonth),
			};
		},
	},
	{ key: "last3Months", getRange: () => getRollingMonthsRange(3) },
	{ key: "last6Months", getRange: () => getRollingMonthsRange(6) },
	{ key: "last12Months", getRange: () => getRollingMonthsRange(12) },
	{ key: "yearToDate", getRange: getDefaultInsightsDateRange },
];

export function matchPreset(
	range: InsightsDateRange,
): InsightsDateRangePresetKey | null {
	const match = INSIGHTS_DATE_RANGE_PRESETS.find((preset) => {
		const presetRange = preset.getRange();
		return (
			presetRange.startDate === range.startDate &&
			presetRange.endDate === range.endDate
		);
	});
	return match?.key ?? null;
}
