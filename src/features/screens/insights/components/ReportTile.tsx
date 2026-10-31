import { useTranslation } from "react-i18next";

import type {
	AverageScoreDataPoint,
	DashboardReportType,
	GenreDataPoint,
	ReportDataPoint,
} from "#/features/screens/reports/types";
import { ReportChart } from "./ReportChart";

type Props = {
	reportType: DashboardReportType;
	data: ReportDataPoint[] | GenreDataPoint[] | AverageScoreDataPoint[];
};

export function ReportTile({ reportType, data }: Props) {
	const { t } = useTranslation();

	function title(): string {
		switch (reportType) {
			case "progress_by_month":
				return t("insights.report.progressByMonth");
			case "items_completed_by_month":
				return t("insights.report.itemsCompletedByMonth");
			case "items_completed_by_genre":
				return t("insights.report.itemsCompletedByGenre");
			case "avg_score_by_genre":
				return t("insights.report.avgScoreByGenre");
			default:
				throw new Error(`Unknown report type: ${reportType satisfies never}`);
		}
	}

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<h2 className="text-base font-semibold text-card-foreground mb-4">
				{title()}
			</h2>
			<ReportChart reportType={reportType} data={data} />
		</div>
	);
}
