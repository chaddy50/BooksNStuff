import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "#/components/hooks/useToast";
import { StatusBadge } from "#/components/StatusBadge";
import { Button } from "#/components/ui/button";
import { PodcastArcPickerDialog } from "#/features/mediaItemSearch/components/PodcastArcPickerDialog";
import { addToLibrary } from "#/features/mediaItemSearch/mediaItemSearch";
import type { SearchResultWithStatus } from "#/features/mediaItemSearch/types";
import { MediaItemType } from "#/lib/enums";

interface ActionButtionProps {
	result: SearchResultWithStatus;
	onClose: () => void;
}

export function ActionButton(props: ActionButtionProps) {
	const { result, onClose } = props;
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { toast } = useToast();
	const [isAdding, setIsAdding] = useState(false);
	const [isPodcastPickerOpen, setIsPodcastPickerOpen] = useState(false);

	async function addItemToLibrary() {
		setIsAdding(true);
		try {
			const { mediaItemId } = await addToLibrary({
				data: {
					externalId: result.externalId,
					externalSource: result.externalSource,
					type: result.type,
					title: result.title,
					description: result.description,
					coverImageUrl: result.coverImageUrl,
					releaseDate: result.releaseDate,
					metadata: result.metadata,
				},
			});
			onClose();
			await navigate({
				to: "/mediaItemDetails/$mediaItemId",
				params: { mediaItemId: String(mediaItemId) },
				state: {
					genreSuggestions:
						(result.metadata.genres as string[] | undefined) ?? [],
				},
			});
		} catch {
			toast(t("search.addToLibraryError"), { variant: "destructive" });
		} finally {
			setIsAdding(false);
		}
	}

	function openExistingItem() {
		if (!result.mediaItemId) return;
		onClose();
		navigate({
			to: "/mediaItemDetails/$mediaItemId",
			params: { mediaItemId: String(result.mediaItemId) },
		});
	}

	if (result.type === MediaItemType.PODCAST) {
		return (
			<>
				<Button
					size="sm"
					variant="outline"
					className="shrink-0"
					onClick={() => setIsPodcastPickerOpen(true)}
				>
					{t("podcast.addArc")}
				</Button>
				<PodcastArcPickerDialog
					mode="add"
					isOpen={isPodcastPickerOpen}
					onClose={() => setIsPodcastPickerOpen(false)}
					podcast={result}
				/>
			</>
		);
	}

	return (
		<>
			{result.mediaItemId ? (
				<StatusBadge
					status={result.status}
					onClick={openExistingItem}
					disabled={isAdding}
				/>
			) : (
				<Button
					size="sm"
					variant="outline"
					className="shrink-0"
					onClick={addItemToLibrary}
					disabled={isAdding}
				>
					{isAdding ? t("search.adding") : t("search.addToLibrary")}
				</Button>
			)}
		</>
	);
}
