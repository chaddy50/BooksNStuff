type LegendEntry = {
	label: string;
	color: string;
	onClick: () => void;
};

type Props = {
	entries: LegendEntry[];
};

export function GenrePieLegend({ entries }: Props) {
	return (
		<ul className="flex flex-row flex-wrap md:flex-col gap-x-3 gap-y-1.5 md:max-w-36">
			{entries.map((entry) => (
				<li key={entry.label}>
					<button
						type="button"
						className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
						onClick={entry.onClick}
					>
						<span
							className="h-2.5 w-2.5 shrink-0 rounded-full"
							style={{ backgroundColor: entry.color }}
						/>
						<span className="truncate">{entry.label}</span>
					</button>
				</li>
			))}
		</ul>
	);
}
