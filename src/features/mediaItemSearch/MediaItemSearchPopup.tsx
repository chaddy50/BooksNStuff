import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { searchMedia } from "#/features/mediaItemSearch/mediaItemSearch";
import type {
	SearchResultWithStatus,
	SearchType,
} from "#/features/mediaItemSearch/types";
import { CreateCustomItemDialog } from "./components/CreateCustomItemDialog";
import { SearchEntryField } from "./components/searchField/SearchEntryField";
import { SearchFilters } from "./components/searchField/SearchFilters";
import { SearchResults } from "./components/searchResults/SearchResults";

interface SearchPopupProps {
	isOpen: boolean;
	onClose: () => void;
}

export function SearchPopup(props: SearchPopupProps) {
	const { isOpen, onClose } = props;
	const { t } = useTranslation();
	const [query, setQuery] = useState("");
	const [filterType, setFilterType] = useState<SearchType>("all");
	const [results, setResults] = useState<SearchResultWithStatus[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const createButtonRef = useRef<HTMLButtonElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Focus input when modal opens
	useEffect(() => {
		if (isOpen) {
			setTimeout(() => inputRef.current?.focus(), 50);
		} else {
			// Reset state when closed
			setQuery("");
			setResults([]);
			setIsSearching(false);
			setIsCreateDialogOpen(false);
		}
	}, [isOpen]);

	// Debounced search
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);

		if (!query.trim()) {
			setResults([]);
			setIsSearching(false);
			return;
		}

		setIsSearching(true);
		debounceRef.current = setTimeout(async () => {
			try {
				const data = await searchMedia({
					data: { query: query.trim(), type: filterType },
				});
				setResults(data);
			} catch {
				setResults([]);
			} finally {
				setIsSearching(false);
			}
		}, 400);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, filterType]);

	function focusActiveFilter(filters: HTMLElement[]) {
		const activeFilter = filters.find(
			(f) => f.getAttribute("aria-pressed") === "true",
		);
		(activeFilter ?? filters[0])?.focus();
	}

	function handleKeyDown(keyboardEvent: KeyboardEvent<HTMLElement>) {
		const targetContainer = keyboardEvent.currentTarget as HTMLElement;
		const resultElements = Array.from(
			targetContainer.querySelectorAll<HTMLElement>("[data-result]"),
		);
		const filterElements = Array.from(
			targetContainer.querySelectorAll<HTMLElement>("[data-filter]"),
		);
		const activeElement = document.activeElement as HTMLElement;

		const resultIndex = resultElements.indexOf(activeElement);
		const filterIndex = filterElements.indexOf(activeElement);
		const isOnInput = activeElement === inputRef.current;
		const isOnFilter = filterIndex >= 0;
		const isOnResult = resultIndex >= 0;
		const isOnCreateButton = activeElement === createButtonRef.current;

		switch (keyboardEvent.key) {
			case "ArrowDown":
				keyboardEvent.preventDefault();
				if (isOnInput) {
					focusActiveFilter(filterElements);
				} else if (isOnFilter) {
					if (resultElements.length > 0) {
						resultElements[0]?.focus();
					} else {
						createButtonRef.current?.focus();
					}
				} else if (isOnResult && resultIndex < resultElements.length - 1) {
					resultElements[resultIndex + 1]?.focus();
				} else if (isOnResult && resultIndex === resultElements.length - 1) {
					createButtonRef.current?.focus();
				}
				break;
			case "ArrowUp":
				keyboardEvent.preventDefault();
				if (isOnCreateButton) {
					if (resultElements.length > 0) {
						resultElements[resultElements.length - 1]?.focus();
					} else {
						focusActiveFilter(filterElements);
					}
				} else if (isOnFilter) {
					inputRef.current?.focus();
				} else if (isOnResult && resultIndex === 0) {
					focusActiveFilter(filterElements);
				} else if (isOnResult) {
					resultElements[resultIndex - 1]?.focus();
				}
				break;
			case "Enter":
				if (!isOnResult) return;
				keyboardEvent.preventDefault();
				activeElement
					.querySelector<HTMLElement>("button:not([disabled])")
					?.click();
				break;
			case "ArrowLeft":
			case "ArrowRight": {
				if (!isOnFilter) return;
				keyboardEvent.preventDefault();
				const next =
					keyboardEvent.key === "ArrowRight"
						? filterIndex + 1
						: filterIndex - 1;
				const nextFilter =
					filterElements[
						(next + filterElements.length) % filterElements.length
					];
				nextFilter?.focus();
				nextFilter?.click();
				break;
			}
		}
	}

	return (
		<>
			<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
				<DialogContent
					className="sm:max-w-xl p-0 gap-0"
					onKeyDown={handleKeyDown}
				>
					<DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
						<DialogTitle className="sr-only">{t("search.title")}</DialogTitle>
						<DialogDescription className="sr-only">
							{t("search.description")}
						</DialogDescription>

						<SearchEntryField
							fieldRef={inputRef}
							query={query}
							setQuery={setQuery}
						/>

						<SearchFilters type={filterType} setType={setFilterType} />
					</DialogHeader>

					<div className="overflow-y-auto max-h-[60vh] px-2 py-2">
						<SearchResults
							isSearching={isSearching}
							query={query}
							results={results}
							onClose={onClose}
						/>
					</div>

					<div className="px-4 py-2 border-t border-border">
						<Button
							ref={createButtonRef}
							variant="ghost"
							size="sm"
							className="text-muted-foreground"
							onClick={() => setIsCreateDialogOpen(true)}
						>
							{t("search.createCustom")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<CreateCustomItemDialog
				isOpen={isCreateDialogOpen}
				onClose={() => setIsCreateDialogOpen(false)}
				initialTitle={query}
				initialType={filterType !== "all" ? filterType : null}
			/>
		</>
	);
}
