import type { ReportDataPoint } from "./types";
import { getDefaultInsightsDateRange } from "./utils";

/**
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */

export const getYearToDateRange = getDefaultInsightsDateRange;

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
