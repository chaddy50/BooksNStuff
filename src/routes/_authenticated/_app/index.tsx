import { createFileRoute } from "@tanstack/react-router";
import { DashboardScreen } from "#/features/screens/dashboard/DashboardScreen";
import { getDashboardData } from "#/features/screens/dashboard/dashboard";

export const Route = createFileRoute("/_authenticated/_app/")({
	loader: () => getDashboardData(),
	component: DashboardScreen,
});
