import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProfileStats } from "#/lib/queries/profileStats";

interface ProfileStatsRowProps {
	stats: ProfileStats;
}

export function ProfileStatsRow({ stats }: ProfileStatsRowProps) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
			<Stat label={t("stats.items")} value={stats.totalCount} />
			<Divider />
			<Stat label={t("stats.completed")} value={stats.completedCount} />
			{stats.averageRating !== null && (
				<>
					<Divider />
					<AverageRatingStat
						label={t("stats.averageRating")}
						value={stats.averageRating}
					/>
				</>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Decorative, so it is hidden from assistive tech rather than announced. */
function Divider() {
	return (
		<div
			aria-hidden="true"
			className="hidden h-5 w-px shrink-0 bg-border md:block"
		/>
	);
}

interface StatProps {
	label: string;
	value: number;
}

function Stat({ label, value }: StatProps) {
	return (
		<div className="flex items-baseline gap-1.5">
			<span className="text-lg font-semibold tabular-nums">{value}</span>
			<span className="text-sm text-muted-foreground">{label}</span>
		</div>
	);
}

interface AverageRatingStatProps {
	label: string;
	value: number;
}

/** Matches StatsBar's treatment: the star is the label, text is the sr-only fallback. */
function AverageRatingStat({ label, value }: AverageRatingStatProps) {
	return (
		<div className="flex items-baseline gap-1.5">
			<span className="text-lg font-semibold tabular-nums">
				{value.toFixed(1)}
			</span>
			<span className="sr-only">{label}</span>
			<Star
				aria-hidden="true"
				className="size-4 self-center text-yellow-800 dark:text-yellow-300"
				fill="currentColor"
			/>
		</div>
	);
}
