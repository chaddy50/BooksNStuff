import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ReportDrilldownScreen } from "#/features/screens/reports/ReportDrilldownScreen";
import { getDrillDownItems } from "#/features/screens/reports/reports";
import type { DashboardReportType } from "#/features/screens/reports/types";

const searchSchema = z.object({
	key: z.string(),
});

export const Route = createFileRoute(
	"/_authenticated/_details/reports/$reportType/drilldown",
)({
	validateSearch: searchSchema,
	loaderDeps: ({ search }: { search: { key: string } }) => ({
		key: search.key,
	}),
	loader: ({ params, deps }) =>
		getDrillDownItems({
			data: {
				reportType: params.reportType as DashboardReportType,
				key: deps.key,
			},
		}),
	component: ReportDrilldownScreen,
});
