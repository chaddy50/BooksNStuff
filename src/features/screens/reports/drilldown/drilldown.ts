import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getLoggedInUser } from "#/features/screens/auth/session";
import { MediaItemType } from "#/lib/enums";
import type { DashboardReportType, DrillDownItemsResult } from "../types";
import { getYearToDateRange } from "../utils.server";
import {
	fetchDrillDownItemsForGenre,
	fetchDrillDownItemsForMonth,
} from "./drilldown.server";

const GENRE_REPORT_TYPES: readonly DashboardReportType[] = [
	"items_completed_by_genre",
	"avg_score_by_genre",
];

export const getDrillDownItems = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			reportType: z.enum([
				"progress_by_month",
				"items_completed_by_month",
				"items_completed_by_genre",
				"avg_score_by_genre",
			]),
			key: z.string(),
		}),
	)
	.handler(async ({ data }): Promise<DrillDownItemsResult> => {
		const user = await getLoggedInUser();

		if (GENRE_REPORT_TYPES.includes(data.reportType)) {
			const { startDate, endDate } = getYearToDateRange();
			return fetchDrillDownItemsForGenre(
				user.id,
				data.key,
				startDate,
				endDate,
				null,
			);
		}

		return fetchDrillDownItemsForMonth(
			user.id,
			data.key,
			data.reportType === "progress_by_month" ? [MediaItemType.BOOK] : null,
		);
	});
