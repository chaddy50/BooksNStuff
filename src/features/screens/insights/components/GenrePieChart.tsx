import {
	Cell,
	Label,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

import {
	type GenrePieSegment,
	getSegmentColor,
	TOOLTIP_CONTENT_STYLE,
} from "./ReportChart";

type Props = {
	segments: GenrePieSegment[];
	total: number;
	totalLabel: string;
	onSelectSegment: (segment: GenrePieSegment) => void;
};

export function GenrePieChart({
	segments,
	total,
	totalLabel,
	onSelectSegment,
}: Props) {
	return (
		<div className="h-55 md:h-[clamp(140px,20vh,220px)] md:flex-1">
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie
						data={segments}
						cx="50%"
						cy="50%"
						innerRadius="59%"
						outerRadius="82%"
						dataKey="value"
						nameKey="label"
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
											{totalLabel}
										</tspan>
									</text>
								);
							}}
						/>
						{segments.map((segment, index) => (
							<Cell
								key={segment.label}
								fill={getSegmentColor(segment, index)}
								onClick={() => onSelectSegment(segment)}
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
