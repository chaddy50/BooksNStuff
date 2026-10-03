import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { TypeBadge } from "#/components/TypeBadge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Thumbnail } from "#/features/mediaItemSearch/components/searchResults/searchResult/components/Thumbnail";
import {
	addRelatedMediaItem,
	type RelatedItemSearchResult,
	searchRelatedItemCandidates,
} from "#/features/screens/mediaItemDetails/relatedItems";

interface AddRelatedItemDialogProps {
	mediaItemId: number;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

const DEBOUNCE_MS = 400;

export function AddRelatedItemDialog({
	mediaItemId,
	isOpen,
	onOpenChange,
}: AddRelatedItemDialogProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const candidatesQueryKey = [
		"relatedItemCandidates",
		mediaItemId,
		debouncedQuery,
	];

	const { data: results = [], isLoading } = useQuery({
		queryKey: candidatesQueryKey,
		queryFn: () =>
			searchRelatedItemCandidates({
				data: { query: debouncedQuery, excludeMediaItemId: mediaItemId },
			}),
		enabled: debouncedQuery.trim().length > 0,
	});

	function handleQueryChange(value: string) {
		setQuery(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(
			() => setDebouncedQuery(value),
			DEBOUNCE_MS,
		);
	}

	async function handleSelect(result: RelatedItemSearchResult) {
		await addRelatedMediaItem({
			data: { mediaItemId, relatedMediaItemId: result.id },
		});
		router.invalidate();
		queryClient.invalidateQueries({
			queryKey: ["relatedItemCandidates", mediaItemId],
		});
	}

	const trimmedQuery = debouncedQuery.trim();

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("relatedItems.dialogTitle")}</DialogTitle>
				</DialogHeader>

				<Input
					value={query}
					onChange={(event) => handleQueryChange(event.target.value)}
					placeholder={t("relatedItems.searchPlaceholder")}
				/>

				<div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
					{trimmedQuery === "" ? (
						<p className="text-sm text-muted-foreground">
							{t("search.prompt")}
						</p>
					) : !isLoading && results.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{t("relatedItems.noResults")}
						</p>
					) : (
						results.map((result) => (
							<button
								key={result.id}
								type="button"
								onClick={() => handleSelect(result)}
								className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 focus:bg-muted/50 focus:outline-none transition-colors text-left"
							>
								<Thumbnail
									url={result.coverImageUrl ?? undefined}
									title={result.title}
								/>
								<span className="flex-1 truncate">{result.title}</span>
								<TypeBadge type={result.type} />
							</button>
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
