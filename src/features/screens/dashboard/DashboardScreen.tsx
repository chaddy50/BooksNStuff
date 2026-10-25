import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { TopBar } from "#/features/navigation/topBar/TopBar";
import { DashboardSection } from "./components/DashboardSection";

const route = getRouteApi("/_authenticated/_app/");

export function DashboardScreen() {
	const { inProgressItems, nextInSeriesItems, recentlyFinishedItems } =
		route.useLoaderData();
	const { t } = useTranslation();

	return (
		<div className="min-h-dvh flex flex-col bg-background text-foreground">
			<TopBar title={t("dashboard.title")} />
			<main className="px-4 md:px-6 py-2 flex-1 min-h-0 flex flex-col gap-2">
				<div className="shrink-0" data-testid="dashboard-primary-row">
					<DashboardSection
						variant="scroll"
						cardWidth="w-48 md:w-[clamp(10rem,19vh,15rem)]"
						title={t("dashboard.inProgress")}
						items={inProgressItems}
						emptyMessage={t("dashboard.emptyInProgress")}
					/>
				</div>
				<div className="shrink-0">
					<DashboardSection
						variant="scroll"
						cardWidth="w-40 md:w-[clamp(8rem,14.5vh,12rem)]"
						title={t("dashboard.nextInSeries")}
						items={nextInSeriesItems}
						emptyMessage={t("dashboard.emptyNextInSeries")}
						shouldShowRating={false}
						shouldShowPurchaseStatus
					/>
				</div>
				<div className="shrink-0">
					<DashboardSection
						variant="scroll"
						cardWidth="w-40 md:w-[clamp(8rem,14.5vh,12rem)]"
						title={t("dashboard.recentlyFinished")}
						items={recentlyFinishedItems}
						emptyMessage={t("dashboard.emptyRecentlyFinished")}
					/>
				</div>
			</main>
		</div>
	);
}
