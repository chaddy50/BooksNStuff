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
}

export function FilterAndSortButton({
	filterAndSortChoices,
	isFilterAndSortPopupOpen,
	setIsFilterAndSortPopupOpen,
	navigateTo = "/",
	subject = "items",
}: FilterAndSortButtonProps) {
	const { t } = useTranslation();
	const numberOfActiveFilters = countActiveFilters(filterAndSortChoices);
	const navigate = useNavigate();

	function handleApply(filters: FilterAndSortOptions) {
		navigate({ to: navigateTo, search: () => filters });
	}

	function handleClearFilters() {
		navigate({
			to: navigateTo,
			search: () => ({
				sortBy: filterAndSortChoices.sortBy,
				sortDirection: filterAndSortChoices.sortDirection,
				titleQuery: filterAndSortChoices.titleQuery,
			}),
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
