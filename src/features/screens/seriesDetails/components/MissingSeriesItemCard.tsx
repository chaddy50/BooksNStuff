import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "#/components/hooks/useToast";
import { MediaItemCard } from "#/components/MediaItemCard";
import { Button } from "#/components/ui/button";
import { addToLibrary } from "#/features/mediaItemSearch/mediaItemSearch";
import type { MissingSeriesItem } from "#/features/screens/seriesDetails/seriesDetails";
import { resolveCreatorName } from "#/lib/creator";
import { MediaItemStatus, PurchaseStatus } from "#/lib/enums";

interface MissingSeriesItemCardProps {
	item: MissingSeriesItem;
	onAdded: (item: MissingSeriesItem) => void;
}

/**
 * One item the provider lists for this series that the user does not own yet,
 * drawn to match the library items above it.
 *
 * MediaItemCard needs an id, a status, a purchase status and a rating that a
 * not-yet-added item has none of. They are synthesized here and every badge
 * they would drive is switched off, so nothing invented is ever shown. The
 * synthetic id is inert because shouldLinkToDetails is false — the card renders
 * a plain div and never builds a details route.
 */
export function MissingSeriesItemCard({
	item,
	onAdded,
}: MissingSeriesItemCardProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const [isAdding, setIsAdding] = useState(false);

	const creatorName = resolveCreatorName(item.type, item.metadata);

	async function handleAdd() {
		setIsAdding(true);
		try {
			await addToLibrary({
				data: {
					externalId: item.externalId,
					externalSource: item.externalSource,
					type: item.type,
					title: item.title,
					description: item.description,
					coverImageUrl: item.coverImageUrl,
					releaseDate: item.releaseDate,
					metadata: item.metadata,
				},
			});
			onAdded(item);
		} catch {
			toast(t("seriesDetails.missingItemAddFailed"), {
				variant: "destructive",
			});
		} finally {
			setIsAdding(false);
		}
	}

	return (
		<div className="flex flex-col gap-2">
			{/* MediaItemCard carries `self-start`, which on this column's cross axis
			    would shrink it to fit-content and collapse its `w-full` artwork to
			    zero width. This plain wrapper stretches instead, and the card fills
			    it. In the grids the card was built for, `self-start` only affects
			    the block axis, so this never came up there. */}
			<div>
				<MediaItemCard
					mediaItem={{
						id: 0,
						title: item.title,
						type: item.type,
						coverImageUrl: item.coverImageUrl ?? null,
						status: MediaItemStatus.BACKLOG,
						purchaseStatus: PurchaseStatus.NOT_PURCHASED,
						rating: 0,
					}}
					shouldLinkToDetails={false}
					shouldShowType={false}
					shouldShowStatus={false}
					shouldShowRating={false}
					shouldShowPurchaseStatus={false}
				/>
			</div>

			<div className="flex flex-col gap-1">
				<span className="text-sm font-medium leading-tight line-clamp-2">
					{item.title}
				</span>
				{creatorName && (
					<span className="text-xs text-muted-foreground line-clamp-1">
						{creatorName}
					</span>
				)}
			</div>

			<Button
				size="sm"
				variant="outline"
				className="w-full"
				onClick={handleAdd}
				disabled={isAdding}
			>
				{isAdding ? t("search.adding") : t("search.addToLibrary")}
			</Button>
		</div>
	);
}
