import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FilterAndSortOptions } from "#/database/schema";
import { MediaItemStatus, PurchaseStatus } from "#/lib/enums";
import {
	isFilteredToCompletedOnly,
	shouldShowCompletedCount,
	shouldShowDroppedCount,
	shouldShowPurchasedCount,
} from "#/lib/filterAndSort";
import type { ItemStats } from "#/lib/queries/types";

interface StatsBarProps {
	stats: ItemStats;
	/**
	 * The filters the counts were gathered under. A count the filters have
	 * already settled is dropped from the bar rather than shown as a number the
	 * user could have predicted.
	 */
	filters?: FilterAndSortOptions | null;
	/** Where a clickable stat navigates to, narrowed to that one value. */
	navigateTo: string;
	params?: Record<string, string>;
}

export function StatsBar({
	stats,
	filters,
	navigateTo,
	params,
}: StatsBarProps) {
	const { t } = useTranslation();

	// An empty result set has nothing worth summarizing, and a row of zeros would
	// only crowd the "no items found" message.
	if (stats.totalCount === 0) {
		return null;
	}

	// A view of nothing but finished items is a record of what was consumed, so
	// what was paid for along the way has no bearing on reading it.
	const isPurchasedShown =
		shouldShowPurchasedCount(filters?.purchaseStatuses) &&
		!isFilteredToCompletedOnly(filters?.statuses);
	const isCompletedShown = shouldShowCompletedCount(filters?.statuses);
	// Most views have nothing dropped, and a permanent zero is just noise.
	const isDroppedShown =
		stats.droppedCount > 0 && shouldShowDroppedCount(filters?.statuses);
	// Nothing in the view is rated, so there is no average to show. Distinct from
	// an average that happens to be low, hence the explicit null check.
	const isAverageRatingShown = stats.averageRating !== null;

	// Gutters match the top bar's own, since this renders inside its sticky
	// header rather than above the list. Each optional section carries its own
	// leading divider, so hiding one never strands a separator.
	return (
		<div
			data-testid="stats-bar"
			className="px-3 pb-2 md:px-6 md:pb-3 grid grid-cols-2 gap-x-4 gap-y-2 md:flex md:flex-wrap md:items-center md:gap-x-5 md:gap-y-1"
		>
			<Stat label={t("stats.items")} value={stats.totalCount} />
			{isPurchasedShown && (
				<>
					<Divider />
					<Stat
						label={t("stats.purchased")}
						value={stats.purchasedCount}
						navigateTo={navigateTo}
						params={params}
						filterOverride={{ purchaseStatuses: [PurchaseStatus.PURCHASED] }}
					/>
				</>
			)}
			{isCompletedShown && (
				<>
					<Divider />
					{/* The uncompleted count is left off deliberately: with the total
					    right there, it is what the completed count already tells you. */}
					<Stat
						label={t("stats.completed")}
						value={stats.completedCount}
						navigateTo={navigateTo}
						params={params}
						filterOverride={{ statuses: [MediaItemStatus.COMPLETED] }}
					/>
				</>
			)}
			{isDroppedShown && (
				<>
					<Divider />
					<Stat
						label={t("stats.dropped")}
						value={stats.droppedCount}
						navigateTo={navigateTo}
						params={params}
						filterOverride={{ statuses: [MediaItemStatus.DROPPED] }}
					/>
				</>
			)}
			{isAverageRatingShown && (
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

interface StatProps {
	label: string;
	value: number;
	navigateTo?: string;
	params?: Record<string, string>;
	/** Present only for a stat with a single-value filter to narrow to; makes it a link. */
	filterOverride?: Partial<FilterAndSortOptions>;
}

/** Decorative, so it is hidden from assistive tech rather than announced. */
function Divider() {
	return (
		<div
			aria-hidden="true"
			data-testid="stats-divider"
			className="hidden md:block h-5 w-px shrink-0 bg-border"
		/>
	);
}

function Stat({ label, value, navigateTo, params, filterOverride }: StatProps) {
	const content = (
		<>
			{/* Tabular figures so the numbers hold their place as counts change. */}
			<span className="text-lg font-semibold tabular-nums">{value}</span>
			<span className="text-sm text-muted-foreground">{label}</span>
		</>
	);

	const statLink = getStatLink({ value, navigateTo, filterOverride });

	if (!statLink) {
		return <div className="flex items-baseline gap-1.5">{content}</div>;
	}

	return (
		<Link
			to={statLink.navigateTo}
			params={params as never}
			search={(prev: Record<string, unknown>) =>
				buildFilterOverrideSearch(prev, statLink)
			}
			className="flex items-baseline gap-1.5"
		>
			{content}
		</Link>
	);
}

interface StatLink {
	navigateTo: string;
	filterOverride: Partial<FilterAndSortOptions>;
	filterOverrideKey: keyof FilterAndSortOptions;
}

/**
 * A stat only links somewhere worth visiting: a real destination, a single
 * filter to narrow to, and a count other than zero.
 */
function getStatLink({
	value,
	navigateTo,
	filterOverride,
}: Pick<StatProps, "value" | "navigateTo" | "filterOverride">):
	| StatLink
	| undefined {
	if (value === 0 || !navigateTo || !filterOverride) {
		return undefined;
	}

	// Single-key by construction — one call site per stat, each narrowing
	// exactly one filter dimension. Doubles as the `filterOrder` entry below, so
	// the title can later list filters in the order they were clicked rather
	// than in a fixed field order.
	const filterOverrideKey = Object.keys(
		filterOverride,
	)[0] as keyof FilterAndSortOptions;

	return { navigateTo, filterOverride, filterOverrideKey };
}

function buildFilterOverrideSearch(
	prev: Record<string, unknown>,
	{ filterOverride, filterOverrideKey }: StatLink,
) {
	const previousOrder = Array.isArray(prev.filterOrder)
		? prev.filterOrder.filter((key) => key !== filterOverrideKey)
		: [];
	return {
		...prev,
		...filterOverride,
		filterOrder: [...previousOrder, filterOverrideKey],
	};
}

interface AverageRatingStatProps {
	label: string;
	value: number | null;
}

/**
 * The one stat that is not a count, so it reads as `4.2 ★` rather than
 * `4.2 Average rating` — the star is the label. It is decorative to assistive
 * tech, which gets the wording instead.
 */
function AverageRatingStat({ label, value }: AverageRatingStatProps) {
	if (value === null) {
		return null;
	}

	return (
		<div
			className="flex items-baseline gap-1.5"
			data-testid="stats-average-rating"
		>
			<span className="text-lg font-semibold tabular-nums">
				{value.toFixed(1)}
			</span>
			<span className="sr-only">{label}</span>
			{/* Matches the stars on the cards below, in both themes. */}
			<Star
				aria-hidden="true"
				className="size-4 self-center text-yellow-800 dark:text-yellow-300"
				fill="currentColor"
			/>
		</div>
	);
}
