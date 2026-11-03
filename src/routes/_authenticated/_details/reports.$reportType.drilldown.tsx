import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { mediaTypeEnum } from "#/database/schema";
import { ReportDrilldownScreen } from "#/features/screens/reports/ReportDrilldownScreen";
import { getDrillDownItems } from "#/features/screens/reports/reports";
import type { DashboardReportType } from "#/features/screens/reports/types";
import { insightsDateRangeSchema } from "#/features/screens/reports/types";

const searchSchema = insightsDateRangeSchema.extend({
	key: z.string(),
	genres: z.array(z.string()).optional(),
	itemTypes: z.array(z.enum(mediaTypeEnum.enumValues)).optional(),
});

export const Route = createFileRoute(
	"/_authenticated/_details/reports/$reportType/drilldown",
)({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ params, deps }) =>
		getDrillDownItems({
			data: {
				reportType: params.reportType as DashboardReportType,
				key: deps.key,
				genres: deps.genres,
				itemTypes: deps.itemTypes,
				startDate: deps.startDate,
				endDate: deps.endDate,
			},
		}),
	component: ReportDrilldownScreen,
});
