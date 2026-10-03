import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteScroll } from "#/components/hooks/useInfiniteScroll";
import { useListCacheKey } from "#/components/hooks/useListCacheKey";
import { InfiniteScrollLoader } from "#/components/InfiniteScrollLoader";
import { MediaItemList } from "#/components/MediaItemList";
import { StatsBar } from "#/components/StatsBar";
import { FilterAndSortButton } from "#/features/filterAndSort/FilterAndSortButton";
import { SearchInput } from "#/features/navigation/topBar/components/SearchInput";
import { TopBar } from "#/features/navigation/topBar/TopBar";
import { applyLibrarySortDefaults } from "#/features/screens/settings/settings";
import {
	isFilteredToSinglePurchaseStatus,
	isFilteredToSingleStatus,
} from "#/lib/filterAndSort";
import { getLibrary, type LibraryItem } from "./library";

const route = getRouteApi("/_authenticated/_app/library");

export function LibraryScreen() {
	const loaderData = route.useLoaderData();
	const search = route.useSearch();
	const { t } = useTranslation();
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	const effectiveSearch = applyLibrarySortDefaults(search, loaderData.settings);
	const shouldShowPurchaseStatus = !isFilteredToSinglePurchaseStatus(
		effectiveSearch.purchaseStatuses,
	);
	const shouldShowStatus = !isFilteredToSingleStatus(effectiveSearch.statuses);
	const cacheKey = useListCacheKey("library", effectiveSearch);

	const { allItems, isLoadingMore, sentinelRef } =
		useInfiniteScroll<LibraryItem>({
			cacheKey,
			initialItems: loaderData.items,
			initialHasMore: loaderData.hasMore,
			fetchMore: (offset, limit) =>
				getLibrary({ data: { ...effectiveSearch, offset, limit } }),
		});

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar
				title={t("library.title")}
				below={
					<StatsBar
						stats={loaderData.stats}
						filters={effectiveSearch}
						navigateTo="/library"
					/>
				}
				right={
					<>
						<SearchInput
							value={search.titleQuery ?? ""}
							navigateTo="/library"
						/>
						<FilterAndSortButton
							filterAndSortChoices={effectiveSearch}
							isFilterAndSortPopupOpen={isFilterOpen}
							setIsFilterAndSortPopupOpen={setIsFilterOpen}
							navigateTo="/library"
						/>
					</>
				}
			/>

			<main className="px-4 md:px-6 py-6">
				<MediaItemList
					items={allItems}
					shouldShowPurchaseStatus={shouldShowPurchaseStatus}
					shouldShowStatus={shouldShowStatus}
				/>
				<div ref={sentinelRef} className="h-1" />
				<InfiniteScrollLoader isLoading={isLoadingMore} />
			</main>
		</div>
	);
}
