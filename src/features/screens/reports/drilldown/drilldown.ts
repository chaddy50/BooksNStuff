import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { mediaTypeEnum } from "#/database/schema";
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

/**
 * "progress_by_month" is always Book-only (see isBookIncludedInItemTypes),
 * so its drilldown stays pinned to Book regardless of the active filter.
 * Every other report type passes the active filter straight through.
 */
export function resolveDrillDownTypeFilter(
	reportType: DashboardReportType,
	itemTypes?: MediaItemType[],
): MediaItemType[] | null {
	if (reportType === "progress_by_month") {
		return [MediaItemType.BOOK];
	}
	return itemTypes && itemTypes.length > 0 ? itemTypes : null;
}

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
			genres: z.array(z.string()).optional(),
			itemTypes: z.array(z.enum(mediaTypeEnum.enumValues)).optional(),
		}),
	)
	.handler(async ({ data }): Promise<DrillDownItemsResult> => {
		const user = await getLoggedInUser();
		const typeFilter = resolveDrillDownTypeFilter(
			data.reportType,
			data.itemTypes,
		);

		if (GENRE_REPORT_TYPES.includes(data.reportType)) {
			const { startDate, endDate } = getYearToDateRange();
			const genreNames =
				data.genres && data.genres.length > 0 ? data.genres : [data.key];
			return fetchDrillDownItemsForGenre(
				user.id,
				genreNames,
				startDate,
				endDate,
				typeFilter,
			);
		}

		return fetchDrillDownItemsForMonth(user.id, data.key, typeFilter);
	});
