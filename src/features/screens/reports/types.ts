import type {
	MediaItemStatus,
	MediaItemType,
	PurchaseStatus,
} from "#/lib/enums";

export type DashboardReportType =
	| "progress_by_month"
	| "items_completed_by_month"
	| "items_completed_by_genre"
	| "avg_score_by_genre";

export const INSIGHTS_REPORT_TYPES: readonly DashboardReportType[] = [
	"items_completed_by_month",
	"items_completed_by_genre",
	"avg_score_by_genre",
	"progress_by_month",
];

export type ReportDataPoint = {
	month: string; // "YYYY-MM"
	value: number;
};

export type GenreDataPoint = {
	genre: string;
	value: number;
};

export type InsightsReport = {
	reportType: DashboardReportType;
	data: ReportDataPoint[] | GenreDataPoint[];
};

export type DrillDownItem = {
	id: number;
	status: MediaItemStatus;
	purchaseStatus: PurchaseStatus;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	rating: number;
	completedAt: string | null;
	expectedReleaseDate: string | null;
	seriesId: number | null;
	seriesName: string | null;
};

export type DrillDownItemsResult = DrillDownItem[];
