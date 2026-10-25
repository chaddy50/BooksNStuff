import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { TopBar } from "#/features/navigation/topBar/TopBar";
import { ReportTile } from "./components/ReportTile";

const route = getRouteApi("/_authenticated/_app/insights");

export function InsightsScreen() {
	const reports = route.useLoaderData();
	const { t } = useTranslation();

	return (
		<div className="min-h-dvh flex flex-col bg-background text-foreground">
			<TopBar title={t("insights.title")} />
			<main className="px-4 md:px-6 py-2 flex-1 min-h-0">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{reports.map(({ reportType, data }) => (
						<ReportTile key={reportType} reportType={reportType} data={data} />
					))}
				</div>
			</main>
		</div>
	);
}
