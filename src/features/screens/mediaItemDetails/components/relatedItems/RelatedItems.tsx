import { useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { MediaItemCard } from "#/components/MediaItemCard";
import { Button } from "#/components/ui/button";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { removeRelatedMediaItem } from "#/features/screens/mediaItemDetails/relatedItems";
import { AddRelatedItemDialog } from "./AddRelatedItemDialog";

interface RelatedItemsProps {
	mediaItemDetails: MediaItemDetails;
}

export function RelatedItems({ mediaItemDetails }: RelatedItemsProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [removingId, setRemovingId] = useState<number | null>(null);

	async function handleRemove(relatedMediaItemId: number) {
		setRemovingId(relatedMediaItemId);
		try {
			await removeRelatedMediaItem({
				data: { mediaItemId: mediaItemDetails.id, relatedMediaItemId },
			});
			router.invalidate();
		} finally {
			setRemovingId(null);
		}
	}

	return (
		<div className="mb-10">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold">{t("relatedItems.title")}</h2>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setIsDialogOpen(true)}
				>
					{t("relatedItems.addButton")}
				</Button>
			</div>

			{mediaItemDetails.relatedItems.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{t("relatedItems.empty")}
				</p>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{mediaItemDetails.relatedItems.map((item) => (
						<div key={item.id} className="group relative">
							<MediaItemCard mediaItem={item} />
							<Button
								variant="ghost"
								size="icon-xs"
								className="absolute top-1.5 left-1.5 bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 hover:text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
								onClick={() => handleRemove(item.id)}
								disabled={removingId === item.id}
								aria-label={t("relatedItems.remove", { title: item.title })}
							>
								<X className="size-3" />
							</Button>
						</div>
					))}
				</div>
			)}

			<AddRelatedItemDialog
				mediaItemId={mediaItemDetails.id}
				isOpen={isDialogOpen}
				onOpenChange={setIsDialogOpen}
			/>
		</div>
	);
}
