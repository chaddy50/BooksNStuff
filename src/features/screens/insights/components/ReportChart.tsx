import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Label,
	Line,
	LineChart,
	Pie,
	PieChart,
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

const TOOLTIP_CONTENT_STYLE = {
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
		return (
			<div className="h-55 md:h-[clamp(140px,20vh,220px)]">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={genreData}
							cx="50%"
							cy="50%"
							innerRadius="59%"
							outerRadius="82%"
							dataKey="value"
							nameKey="genre"
							style={{ cursor: "pointer" }}
						>
							<Label
								content={({ viewBox }) => {
									const { cx, cy } = viewBox as { cx: number; cy: number };
									return (
										<text textAnchor="middle">
											<tspan
												x={cx}
												y={cy - 6}
												fontSize={24}
												fontWeight="bold"
												fill="var(--card-foreground)"
											>
												{total}
											</tspan>
											<tspan
												x={cx}
												y={cy + 16}
												fontSize={12}
												fill="var(--muted-foreground)"
											>
												{t("insights.report.progressLabels.items")}
											</tspan>
										</text>
									);
								}}
							/>
							{genreData.map((entry, index) => (
								<Cell
									key={entry.genre}
									fill={PIE_COLORS[index % PIE_COLORS.length]}
									onClick={() => navigateToDrillDown(entry.genre)}
								/>
							))}
						</Pie>
						<Tooltip
							formatter={(value, name) => [value, name]}
							contentStyle={TOOLTIP_CONTENT_STYLE}
							itemStyle={{ color: "var(--card-foreground)" }}
						/>
					</PieChart>
				</ResponsiveContainer>
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
						domain={[0, 5]}
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
