import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { mediaTypeEnum } from "#/database/schema";
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
import { isBookIncludedInItemTypes } from "./utils";

// ---- Exported server functions ----------------------------------------------

const getInsightsReportsInput = insightsDateRangeSchema.required().extend({
	itemTypes: z.array(z.enum(mediaTypeEnum.enumValues)).default([]),
});

export const getInsightsReports = createServerFn({ method: "GET" })
	.inputValidator(getInsightsReportsInput)
	.handler(async ({ data }): Promise<InsightsReport[]> => {
		const user = await getLoggedInUser();
		const { startDate, endDate, itemTypes } = data;
		const typeFilter = itemTypes.length > 0 ? itemTypes : null;
		const isBookIncluded = isBookIncludedInItemTypes(itemTypes);

		const [
			progressByMonth,
			itemsCompletedByMonth,
			itemsCompletedByGenre,
			avgScoreByGenre,
		] = await Promise.all([
			isBookIncluded
				? fetchProgressByMonth(user.id, MediaItemType.BOOK, startDate, endDate)
				: Promise.resolve([]),
			fetchItemsCompletedByMonth(user.id, startDate, endDate, typeFilter),
			fetchItemsCompletedByGenre(user.id, startDate, endDate, typeFilter),
			fetchAverageScoreByGenre(user.id, startDate, endDate, typeFilter),
		]);

		const dataByReportType = {
			progress_by_month: progressByMonth,
			items_completed_by_month: itemsCompletedByMonth,
			items_completed_by_genre: itemsCompletedByGenre,
			avg_score_by_genre: avgScoreByGenre,
		};

		const reportTypes = isBookIncluded
			? INSIGHTS_REPORT_TYPES
			: INSIGHTS_REPORT_TYPES.filter((type) => type !== "progress_by_month");

		return reportTypes.map((reportType) => ({
			reportType,
			data: dataByReportType[reportType],
		}));
	});

export { getDrillDownItems };
