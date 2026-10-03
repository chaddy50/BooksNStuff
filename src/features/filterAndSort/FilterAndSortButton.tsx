import { useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import type { FilterAndSortOptions, ViewSubject } from "#/database/schema";
import { FilterAndSortDialog } from "./FilterAndSortDialog";

interface FilterAndSortButtonProps {
	filterAndSortChoices: FilterAndSortOptions;
	isFilterAndSortPopupOpen: boolean;
	setIsFilterAndSortPopupOpen: Dispatch<SetStateAction<boolean>>;
	navigateTo: string;
	subject?: ViewSubject;
	/** Path params `navigateTo` needs, e.g. `{ viewId: "7" }` for `/views/$viewId`. */
	params?: Record<string, string>;
	/**
	 * True when `filterAndSortChoices` is a transient overlay on top of a
	 * separately-saved baseline (a view), rather than the only source of truth
	 * (library/series). Applying then preserves the title search — a separate
	 * control the dialog never touches — instead of letting the dialog's full
	 * replace drop it, and clearing reverts to no overlay at all (including
	 * sort) instead of keeping whatever sort happened to be active.
	 */
	isOverlayOnSavedFilters?: boolean;
	/**
	 * Overrides the badge count instead of deriving it from `filterAndSortChoices`.
	 * A view's `filterAndSortChoices` is its effective (saved + overlay) filters, which
	 * would otherwise count the view's own permanent filters as if they were part of
	 * the clearable overlay.
	 */
	activeFilterCount?: number;
}

export function FilterAndSortButton({
	filterAndSortChoices,
	isFilterAndSortPopupOpen,
	setIsFilterAndSortPopupOpen,
	navigateTo = "/",
	subject = "items",
	params,
	isOverlayOnSavedFilters = false,
	activeFilterCount,
}: FilterAndSortButtonProps) {
	const { t } = useTranslation();
	const numberOfActiveFilters =
		activeFilterCount ?? countActiveFilters(filterAndSortChoices);
	const navigate = useNavigate();

	function handleApply(filters: FilterAndSortOptions) {
		navigate({
			to: navigateTo,
			params: params as never,
			search: () =>
				isOverlayOnSavedFilters
					? { ...filters, titleQuery: filterAndSortChoices.titleQuery }
					: filters,
		});
	}

	function handleClearFilters() {
		navigate({
			to: navigateTo,
			params: params as never,
			search: () =>
				isOverlayOnSavedFilters
					? { titleQuery: filterAndSortChoices.titleQuery }
					: {
							sortBy: filterAndSortChoices.sortBy,
							sortDirection: filterAndSortChoices.sortDirection,
							titleQuery: filterAndSortChoices.titleQuery,
						},
		});
	}

	return (
		<>
			{numberOfActiveFilters > 0 ? (
				<div className="flex items-center">
					<Button
						variant="outline"
						size="icon"
						className="max-sm:size-11 max-md:h-11 sm:w-auto sm:px-4 gap-2 w-auto px-2 rounded-r-none border-r-0"
						onClick={() => setIsFilterAndSortPopupOpen(true)}
					>
						<SlidersHorizontal className="size-4 shrink-0" />
						<span className="sr-only sm:not-sr-only">
							{t("library.filterAndSort")}
						</span>
						<span className="bg-primary text-primary-foreground rounded-full text-xs size-5 flex items-center justify-center shrink-0">
							{numberOfActiveFilters}
						</span>
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="max-md:size-11 rounded-l-none px-2 w-auto"
						onClick={handleClearFilters}
						aria-label={t("library.clearFilters")}
					>
						<X className="size-3.5" />
					</Button>
				</div>
			) : (
				<Button
					variant="outline"
					size="icon"
					className="max-sm:size-11 max-md:h-11 sm:w-auto sm:px-4 gap-2"
					onClick={() => setIsFilterAndSortPopupOpen(true)}
				>
					<SlidersHorizontal className="size-4 shrink-0" />
					<span className="sr-only sm:not-sr-only">
						{t("library.filterAndSort")}
					</span>
				</Button>
			)}
			<FilterAndSortDialog
				isOpen={isFilterAndSortPopupOpen}
				onClose={() => setIsFilterAndSortPopupOpen(false)}
				initialFilters={filterAndSortChoices}
				onApply={handleApply}
				subject={subject}
			/>
		</>
	);
}

export function countActiveFilters(
	filterAndSortOptions: FilterAndSortOptions,
): number {
	let count = 0;
	if (filterAndSortOptions.mediaTypes?.length) count += 1;
	if (filterAndSortOptions.statuses?.length) count += 1;
	if (filterAndSortOptions.purchaseStatuses?.length) count += 1;
	if (
		filterAndSortOptions.completedThisYear ||
		filterAndSortOptions.completedDateStart !== undefined ||
		filterAndSortOptions.completedDateEnd !== undefined
	) {
		count += 1;
	}
	if (filterAndSortOptions.tags?.length) count += 1;
	if (filterAndSortOptions.genres?.length) count += 1;
	if (filterAndSortOptions.creatorQuery) count += 1;
	if (filterAndSortOptions.isSeriesComplete !== undefined) count += 1;
	return count;
}
