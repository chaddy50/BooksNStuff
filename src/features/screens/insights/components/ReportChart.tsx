import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type {
	DashboardReportType,
	GenreDataPoint,
	ReportDataPoint,
} from "#/features/screens/reports/types";
import { MAXIMUM_RATING } from "#/lib/rating";
import { GenrePieChart } from "./GenrePieChart";
import { GenrePieLegend } from "./GenrePieLegend";

const PIE_COLORS = [
	"#69359c",
	"#a855f7",
	"#3b82f6",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#06b6d4",
	"#ec4899",
	"#14b8a6",
];

const AVG_SCORE_AXIS_TICKS = Array.from(
	{ length: MAXIMUM_RATING + 1 },
	(_, index) => index,
);

const GENRE_LEGEND_LIMIT = 5;
const OTHER_SEGMENT_COLOR = "#9ca3af";

export type GenrePieSegment = {
	label: string;
	value: number;
	genreNames: string[];
	isOther: boolean;
};

export function buildGenrePieSegments(
	genreData: GenreDataPoint[],
	otherLabel: string,
	topCount = GENRE_LEGEND_LIMIT,
): GenrePieSegment[] {
	if (genreData.length <= topCount) {
		return genreData.map((entry) => ({
			label: entry.genre,
			value: entry.value,
			genreNames: [entry.genre],
			isOther: false,
		}));
	}

	const topEntries = genreData.slice(0, topCount);
	const remainingEntries = genreData.slice(topCount);
	const topSegments = topEntries.map((entry) => ({
		label: entry.genre,
		value: entry.value,
		genreNames: [entry.genre],
		isOther: false,
	}));
	const otherSegment: GenrePieSegment = {
		label: otherLabel,
		value: remainingEntries.reduce((sum, entry) => sum + entry.value, 0),
		genreNames: remainingEntries.map((entry) => entry.genre),
		isOther: true,
	};

	return [...topSegments, otherSegment];
}

export function getSegmentColor(
	segment: GenrePieSegment,
	index: number,
): string {
	return segment.isOther
		? OTHER_SEGMENT_COLOR
		: PIE_COLORS[index % PIE_COLORS.length];
}

export const TOOLTIP_CONTENT_STYLE = {
	backgroundColor: "var(--card)",
	border: "1px solid var(--border)",
	borderRadius: "var(--radius)",
	fontSize: "12px",
	color: "var(--card-foreground)",
};

function getYear(yearMonth: string): string {
	return yearMonth.split("-")[0] ?? "";
}

function spansMultipleYears(data: ReportDataPoint[]): boolean {
	if (data.length === 0) {
		return false;
	}
	const firstYear = getYear(data[0].month);
	return data.some((point) => getYear(point.month) !== firstYear);
}

function getMonthAbbr(yearMonth: string): string {
	const [year, month] = yearMonth.split("-");
	const date = new Date(Number(year), Number(month) - 1, 1);
	return date.toLocaleString("default", { month: "short" });
}

function formatTooltipLabel(yearMonth: string): string {
	return `${getMonthAbbr(yearMonth)} ${getYear(yearMonth)}`;
}

type Props = {
	reportType: DashboardReportType;
	data: ReportDataPoint[] | GenreDataPoint[];
};

export function ReportChart({ reportType, data }: Props) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	function navigateToDrillDown(key: string) {
		navigate({
			to: "/reports/$reportType/drilldown",
			params: { reportType },
			search: { key },
		});
	}

	function navigateToDrillDownForGenres(label: string, genreNames: string[]) {
		navigate({
			to: "/reports/$reportType/drilldown",
			params: { reportType },
			search: { key: label, genres: genreNames },
		});
	}

	function formatTick(yearMonth: string): string {
		const timeData = data as ReportDataPoint[];
		if (!spansMultipleYears(timeData)) {
			return getMonthAbbr(yearMonth);
		}
		const year = getYear(yearMonth).slice(2);
		return `${getMonthAbbr(yearMonth)} '${year}`;
	}

	function getProgressLabel(): string {
		return reportType === "progress_by_month"
			? t("insights.report.progressLabels.pages")
			: t("insights.report.progressLabels.items");
	}

	if (reportType === "items_completed_by_genre") {
		const genreData = data as GenreDataPoint[];
		const total = genreData.reduce((sum, d) => sum + d.value, 0);
		const segments = buildGenrePieSegments(
			genreData,
			t("insights.report.other"),
		);
		const legendEntries = segments.map((segment, index) => ({
			label: segment.label,
			color: getSegmentColor(segment, index),
			onClick: () =>
				navigateToDrillDownForGenres(segment.label, segment.genreNames),
		}));
		return (
			<div className="flex flex-col md:flex-row md:items-center gap-4">
				<GenrePieChart
					segments={segments}
					total={total}
					totalLabel={t("insights.report.progressLabels.items")}
					onSelectSegment={(segment) =>
						navigateToDrillDownForGenres(segment.label, segment.genreNames)
					}
				/>
				<GenrePieLegend entries={legendEntries} />
			</div>
		);
	}

	if (reportType === "avg_score_by_genre") {
		const genreData = data as GenreDataPoint[];
		const chartHeight = Math.max(220, genreData.length * 36);
		return (
			<ResponsiveContainer width="100%" height={chartHeight}>
				<BarChart
					data={genreData}
					layout="vertical"
					margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
					style={{ cursor: "pointer" }}
				>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke="var(--border)"
						horizontal={false}
					/>
					<XAxis
						type="number"
						domain={[0, MAXIMUM_RATING]}
						ticks={AVG_SCORE_AXIS_TICKS}
						tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis
						type="category"
						dataKey="genre"
						tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
						axisLine={false}
						tickLine={false}
						width={90}
					/>
					<Tooltip
						content={({ active, payload, label }) => {
							if (!active || !payload || payload.length === 0) {
								return null;
							}
							return (
								<div style={{ ...TOOLTIP_CONTENT_STYLE, padding: "6px 10px" }}>
									<p style={{ marginBottom: 2 }}>{label}</p>
									<p>
										{t("insights.report.avgScore")}:{" "}
										{Number(payload[0]?.value).toFixed(1)}
									</p>
								</div>
							);
						}}
						cursor={{ fill: "var(--border)", opacity: 0.4 }}
					/>
					<Bar
						dataKey="value"
						radius={[0, 4, 4, 0]}
						onClick={(barData: unknown) =>
							navigateToDrillDown((barData as GenreDataPoint).genre)
						}
					>
						{genreData.map((entry, index) => (
							<Cell
								key={entry.genre}
								fill={PIE_COLORS[index % PIE_COLORS.length]}
							/>
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		);
	}

	// progress_by_month and items_completed_by_month
	const timeData = data as ReportDataPoint[];
	const progressLabel = getProgressLabel();

	return (
		<div className="h-55 md:h-[clamp(140px,20vh,220px)]">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={timeData}
					margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
				>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke="var(--border)"
						vertical={false}
					/>
					<XAxis
						dataKey="month"
						tickFormatter={formatTick}
						tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis
						allowDecimals={false}
						tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
						axisLine={false}
						tickLine={false}
						width={36}
					/>
					<Tooltip
						formatter={(value) => [value, progressLabel]}
						labelFormatter={(label) => formatTooltipLabel(String(label))}
						contentStyle={TOOLTIP_CONTENT_STYLE}
						itemStyle={{ color: "var(--card-foreground)" }}
						cursor={{ stroke: "var(--border)" }}
					/>
					<Line
						type="monotone"
						dataKey="value"
						stroke="#69359c"
						strokeWidth={2}
						dot={{ r: 4, fill: "#69359c", strokeWidth: 0 }}
						activeDot={{
							r: 6,
							fill: "#69359c",
							strokeWidth: 0,
							style: { cursor: "pointer" },
							onClick: (_event: unknown, payload: unknown) =>
								navigateToDrillDown(
									(payload as { payload: ReportDataPoint }).payload.month,
								),
						}}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
