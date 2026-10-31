import { createFileRoute } from "@tanstack/react-router";
import { InsightsScreen } from "#/features/screens/insights/InsightsScreen";
import { getInsightsReports } from "#/features/screens/reports/reports";
import { insightsDateRangeSchema } from "#/features/screens/reports/types";
import { applyInsightsDateRangeDefaults } from "#/features/screens/reports/utils";

export const Route = createFileRoute("/_authenticated/_app/insights")({
	validateSearch: insightsDateRangeSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) =>
		getInsightsReports({ data: applyInsightsDateRangeDefaults(deps) }),
	component: InsightsScreen,
});
