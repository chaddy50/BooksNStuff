import type { customReports } from "#/database/schema";
import type { MediaItemType } from "#/lib/enums";
import { getLocalDateString } from "#/lib/utils";
import {
	type CustomReport,
	type DashboardReportType,
	REPORT_MONTH_OPTIONS,
	type ReportDataPoint,
	type ReportMonthOption,
} from "./types";

/**
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */

export function rowToCustomReport(
	row: typeof customReports.$inferSelect,
): CustomReport {
	return {
		id: row.id,
		name: row.name,
		reportType: row.reportType as DashboardReportType,
		mediaTypes: (row.mediaTypes as MediaItemType[] | null) ?? null,
		monthCount: (REPORT_MONTH_OPTIONS.includes(
			row.monthCount as ReportMonthOption,
		)
			? row.monthCount
			: 12) as ReportMonthOption,
	};
}

export function getStartDateFromMonthCount(monthCount: number): string {
	const startDate = new Date();
	startDate.setDate(1);
	startDate.setMonth(startDate.getMonth() - (monthCount - 1));
	return getLocalDateString(startDate);
}

export function getDateRangeFromMonthCount(monthCount: number): {
	startDate: string;
	endDate: string;
} {
	return {
		startDate: getStartDateFromMonthCount(monthCount),
		endDate: getLocalDateString(new Date()),
	};
}

/**
 * Builds an ascending array of calendar months from startDate's month through
 * endDate's month, pairing each with its value from the provided rows.
 * Months not present in rows default to 0.
 */
export function buildMonthRange(
	rows: { month: string; value: number }[],
	startDate: string,
	endDate: string,
): ReportDataPoint[] {
	const valueByMonth = new Map(rows.map((r) => [r.month, Number(r.value)]));
	const months: ReportDataPoint[] = [];

	const [startYear, startMonthOneBased] = startDate.split("-").map(Number);
	const [endYear, endMonthOneBased] = endDate.split("-").map(Number);

	let year = startYear;
	let month = startMonthOneBased - 1; // 0-based

	const endMonth = endMonthOneBased - 1; // 0-based

	while (year < endYear || (year === endYear && month <= endMonth)) {
		const key = `${year}-${String(month + 1).padStart(2, "0")}`;
		months.push({ month: key, value: valueByMonth.get(key) ?? 0 });
		month++;
		if (month > 11) {
			month = 0;
			year++;
		}
	}

	return months;
}
