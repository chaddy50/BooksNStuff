import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { ArrowUpDown, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteScroll } from "#/components/hooks/useInfiniteScroll";
import { useListCacheKey } from "#/components/hooks/useListCacheKey";
import { InfiniteScrollLoader } from "#/components/InfiniteScrollLoader";
import { MediaItemList } from "#/components/MediaItemList";
import { SeriesList } from "#/components/SeriesList";
import { StatsBar } from "#/components/StatsBar";
import { Button } from "#/components/ui/button";
import { SearchInput } from "#/features/navigation/topBar/components/SearchInput";
import { TopBar } from "#/features/navigation/topBar/TopBar";
import { EditViewDialog } from "#/features/screens/customView/EditViewDialog";
import type { LibraryItem } from "#/features/screens/library/library";
import type { SeriesListItem } from "#/features/screens/series/series";
import { MediaItemStatus, PurchaseStatus } from "#/lib/enums";
import {
	isFilteredToSinglePurchaseStatus,
	isFilteredToSingleStatus,
} from "#/lib/filterAndSort";
import {
	type ItemQueryItem,
	REORDERABLE_ITEM_LIMIT,
} from "#/lib/queries/types";
import { ReorderableItemGrid } from "./components/ReorderableItemGrid";
import {
	applyViewFilterOverrides,
	deleteView,
	getViewOrderItems,
	getViewResults,
	reorderViewItems,
	type View,
} from "./view";

type PaginatedResult<T> = { items: T[]; hasMore: boolean };

const route = getRouteApi("/_authenticated/_app/views/$viewId");

export function ViewScreen() {
	const { view, results, stats } = route.useLoaderData();
	const search = route.useSearch();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [_isDeleting, setIsDeleting] = useState(false);
	const [isReordering, setIsReordering] = useState(false);
	const [orderItems, setOrderItems] = useState<ItemQueryItem[] | null>(null);
	const [isReorderPending, setIsReorderPending] = useState(false);
	const [hasReorderFailed, setHasReorderFailed] = useState(false);
	const [isFinishingReorder, setIsFinishingReorder] = useState(false);
	// Saves are chained rather than fired independently: each one rewrites the
	// view's whole order, so two in flight at once could land out of order and
	// leave the earlier drag's sequence as the winner.
	const pendingReorderSaveRef = useRef<Promise<unknown>>(Promise.resolve());
	const loaderItemsBeforeRefreshRef = useRef<unknown>(null);

	// Any item view can be arranged by hand; doing so is what switches it to
	// custom order. Series views have no per-item order to write.
	const isItemView = view.subject === "items";
	// A stats-bar click narrows through the URL rather than the view's saved
	// filters, so the badges and the bar both need the narrowed view.
	const effectiveFilters = applyViewFilterOverrides(view.filters, search);
	const shouldShowPurchaseStatus = !isFilteredToSinglePurchaseStatus(
		effectiveFilters.purchaseStatuses,
	);
	const shouldShowStatus = !isFilteredToSingleStatus(effectiveFilters.statuses);
	// Narrowing through the URL leaves the view's own name on screen unchanged,
	// so the title is the only thing that would otherwise tell the user they
	// are looking at a subset rather than the whole view.
	const activeFilterOverrideLabels = getActiveFilterOverrideLabels(search, t);
	const title =
		activeFilterOverrideLabels.length > 0
			? `${view.name} - ${activeFilterOverrideLabels.join(", ")}`
			: view.name;
	const paginatedResults = results as
		| PaginatedResult<LibraryItem>
		| PaginatedResult<SeriesListItem>;
	const cacheKey = useListCacheKey(`view:${view.id}`, search);

	const { allItems, isLoadingMore, sentinelRef } = useInfiniteScroll<
		LibraryItem | SeriesListItem
	>({
		cacheKey,
		initialItems: paginatedResults.items,
		initialHasMore: paginatedResults.hasMore,
		fetchMore: (offset, limit) =>
			getViewResults({
				data: {
					viewId: view.id,
					titleQuery: search.titleQuery,
					statuses: search.statuses,
					purchaseStatuses: search.purchaseStatuses,
					offset,
					limit,
				},
			}).then(
				(result) =>
					result.results as PaginatedResult<LibraryItem | SeriesListItem>,
			),
	});

	/**
	 * Hands the screen back to the paginated list, but only once the refreshed
	 * loader data has actually rendered.
	 *
	 * The router commits loader updates inside a React transition, so
	 * `router.invalidate()` resolving does not mean the new data is on screen —
	 * React may still commit it a frame or more later. Swapping on any kind of
	 * timer therefore races the transition and lets the list paint its pre-drag
	 * order first. Waiting for the data identity to change is the only signal
	 * that is actually tied to the thing being waited on.
	 *
	 * `useInfiniteScroll` re-pages from the same loader data in an effect declared
	 * above this one. While only the first page is loaded it needs no extra fetch,
	 * so both land in one commit and the list's first render already has the new
	 * order. Once further pages have been scrolled in, refreshing them is a
	 * round trip, so the list can briefly paint the pre-drag order for those rows
	 * before the refreshed pages arrive.
	 */
	useEffect(() => {
		if (!isFinishingReorder) {
			return;
		}
		if (paginatedResults.items === loaderItemsBeforeRefreshRef.current) {
			return;
		}
		setIsFinishingReorder(false);
		setIsReordering(false);
		setOrderItems(null);
	}, [isFinishingReorder, paginatedResults.items]);

	async function handleDelete() {
		setIsDeleting(true);
		try {
			await deleteView({ data: { id: view.id } });
			await queryClient.invalidateQueries({ queryKey: ["views"] });
			router.history.back();
		} finally {
			setIsDeleting(false);
		}
	}

	function handleUpdated() {
		router.invalidate();
	}

	function handleReorder(orderedMediaItemIds: number[]) {
		setHasReorderFailed(false);
		pendingReorderSaveRef.current = pendingReorderSaveRef.current
			.then(() =>
				reorderViewItems({
					data: { viewId: view.id, orderedMediaItemIds },
				}),
			)
			.catch(() => {
				setHasReorderFailed(true);
			});
	}

	async function handleToggleReorder() {
		if (isReordering) {
			setIsReorderPending(true);
			try {
				// The drops save in the background, so the last one may still be in
				// flight. Refetching before it lands would re-read the pre-drag order
				// and look like the reordering was thrown away.
				await pendingReorderSaveRef.current;

				// A drag also switches the view to custom order, so the cached copy
				// of its filters is stale now.
				await queryClient.invalidateQueries({ queryKey: ["views"] });

				// Remember what the list is holding right now, so the hand-off can
				// tell the refreshed data apart from the pre-drag data.
				loaderItemsBeforeRefreshRef.current = paginatedResults.items;
				setIsFinishingReorder(true);
				await router.invalidate();
			} finally {
				setIsReorderPending(false);
			}
			return;
		}

		setHasReorderFailed(false);
		setIsReorderPending(true);
		try {
			setOrderItems(await getViewOrderItems({ data: { viewId: view.id } }));
			setIsReordering(true);
		} finally {
			setIsReorderPending(false);
		}
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar
				title={title}
				below={
					!isReordering && stats ? (
						<StatsBar
							stats={stats}
							filters={effectiveFilters}
							navigateTo="/views/$viewId"
							params={{ viewId: String(view.id) }}
						/>
					) : null
				}
				right={
					<>
						{/* Searching while reordering would narrow the grid, and a drop
						    then rewrites positions using only the visible items. */}
						{!isReordering && (
							<SearchInput
								value={search.titleQuery ?? ""}
								navigateTo="/views/$viewId"
								params={{ viewId: String(view.id) }}
							/>
						)}
						{isItemView && (
							<Button
								variant={isReordering ? "default" : "outline"}
								size="icon"
								className="sm:w-auto sm:px-4"
								onClick={handleToggleReorder}
								disabled={isReorderPending}
							>
								<ArrowUpDown className="size-4" />
								<span className="sr-only sm:not-sr-only sm:ml-1">
									{isReordering
										? t("views.doneReordering")
										: t("views.reorder")}
								</span>
							</Button>
						)}
						<Button
							variant="outline"
							size="icon"
							className="sm:w-auto sm:px-4"
							onClick={() => setIsEditDialogOpen(true)}
						>
							<Pencil className="size-4" />
							<span className="sr-only sm:not-sr-only sm:ml-1">
								{t("views.editView")}
							</span>
						</Button>
					</>
				}
			/>

			<main className="px-4 md:px-6 py-6">
				{isReordering && orderItems ? (
					<>
						<p className="text-sm text-muted-foreground mb-4">
							{t("views.reorderHint")}
						</p>
						{orderItems.length === REORDERABLE_ITEM_LIMIT && (
							<p className="text-sm text-muted-foreground mb-4">
								{t("views.reorderLimitNotice", {
									count: REORDERABLE_ITEM_LIMIT,
								})}
							</p>
						)}
						{hasReorderFailed && (
							<p className="text-sm text-destructive mb-4">
								{t("views.reorderFailed")}
							</p>
						)}
						<ReorderableItemGrid
							items={orderItems}
							onReorder={handleReorder}
							shouldShowPurchaseStatus={shouldShowPurchaseStatus}
							shouldShowStatus={shouldShowStatus}
						/>
					</>
				) : (
					<>
						{isItemView ? (
							<MediaItemList
								items={allItems as LibraryItem[]}
								shouldShowPurchaseStatus={shouldShowPurchaseStatus}
								shouldShowStatus={shouldShowStatus}
							/>
						) : (
							<SeriesList items={allItems as SeriesListItem[]} />
						)}
						<div ref={sentinelRef} className="h-1" />
						<InfiniteScrollLoader isLoading={isLoadingMore} />
					</>
				)}
			</main>

			<EditViewDialog
				view={view as View}
				isOpen={isEditDialogOpen}
				onClose={() => setIsEditDialogOpen(false)}
				onUpdated={handleUpdated}
				onDelete={handleDelete}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** The labels for whichever single-value status/purchase-status overrides a stats-bar click set. */
type FilterOverrideDimension = "statuses" | "purchaseStatuses";

function getActiveFilterOverrideLabels(
	search: {
		statuses?: MediaItemStatus[];
		purchaseStatuses?: PurchaseStatus[];
		filterOrder?: FilterOverrideDimension[];
	},
	t: TFunction,
): string[] {
	const labelByDimension: Partial<Record<FilterOverrideDimension, string>> = {};
	if (search.statuses?.[0] === MediaItemStatus.COMPLETED) {
		labelByDimension.statuses = t("stats.completed");
	}
	if (search.statuses?.[0] === MediaItemStatus.DROPPED) {
		labelByDimension.statuses = t("stats.dropped");
	}
	if (search.purchaseStatuses?.[0] === PurchaseStatus.PURCHASED) {
		labelByDimension.purchaseStatuses = t("stats.purchased");
	}

	const activeDimensions = Object.keys(
		labelByDimension,
	) as FilterOverrideDimension[];
	// `filterOrder` only has entries for dimensions a stats-bar click actually
	// set; a dimension missing from it (a shared link, say) falls back after
	// the ones that do, in a stable default order.
	const clickedDimensionsStillActive = (search.filterOrder ?? []).filter(
		(dimension) => activeDimensions.includes(dimension),
	);
	const unclickedDimensions = activeDimensions.filter(
		(dimension) => !clickedDimensionsStillActive.includes(dimension),
	);

	return [...clickedDimensionsStillActive, ...unclickedDimensions].map(
		(dimension) => labelByDimension[dimension] as string,
	);
}
