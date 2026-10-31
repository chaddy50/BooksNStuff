import { createServerFn } from "@tanstack/react-start";

import { getLoggedInUser } from "#/features/screens/auth/session";
import { MediaItemType } from "#/lib/enums";
import { getDrillDownItems } from "./drilldown/drilldown";
import { fetchAverageScoreByGenre } from "./reportTypes/averageScoreByGenre.server";
import { fetchItemsCompletedByGenre } from "./reportTypes/itemsCompletedByGenre.server";
import { fetchItemsCompletedByMonth } from "./reportTypes/itemsCompletedByMonth.server";
import { fetchProgressByMonth } from "./reportTypes/progressByMonth.server";
import {
	INSIGHTS_REPORT_TYPES,
	type InsightsReport,
	insightsDateRangeSchema,
} from "./types";

// ---- Exported server functions ----------------------------------------------

export const getInsightsReports = createServerFn({ method: "GET" })
	.inputValidator(insightsDateRangeSchema.required())
	.handler(async ({ data }): Promise<InsightsReport[]> => {
		const user = await getLoggedInUser();
		const { startDate, endDate } = data;

		const [
			progressByMonth,
			itemsCompletedByMonth,
			itemsCompletedByGenre,
			avgScoreByGenre,
		] = await Promise.all([
			fetchProgressByMonth(user.id, MediaItemType.BOOK, startDate, endDate),
			fetchItemsCompletedByMonth(user.id, startDate, endDate, null),
			fetchItemsCompletedByGenre(user.id, startDate, endDate, null),
			fetchAverageScoreByGenre(user.id, startDate, endDate, null),
		]);

		const dataByReportType = {
			progress_by_month: progressByMonth,
			items_completed_by_month: itemsCompletedByMonth,
			items_completed_by_genre: itemsCompletedByGenre,
			avg_score_by_genre: avgScoreByGenre,
		};

		return INSIGHTS_REPORT_TYPES.map((reportType) => ({
			reportType,
			data: dataByReportType[reportType],
		}));
	});

export { getDrillDownItems };
