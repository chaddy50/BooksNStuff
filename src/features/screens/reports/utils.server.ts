import type { ReportDataPoint } from "./types";

/**
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */

export function getYearToDateRange(): { startDate: string; endDate: string } {
	const today = new Date();
	const startOfYear = new Date(today.getFullYear(), 0, 1);
	return {
		startDate: startOfYear.toISOString().slice(0, 10),
		endDate: today.toISOString().slice(0, 10),
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
