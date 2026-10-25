import { createFileRoute } from "@tanstack/react-router";
import { InsightsScreen } from "#/features/screens/insights/InsightsScreen";
import { getInsightsReports } from "#/features/screens/reports/reports";

export const Route = createFileRoute("/_authenticated/_app/insights")({
	loader: () => getInsightsReports(),
	component: InsightsScreen,
});
