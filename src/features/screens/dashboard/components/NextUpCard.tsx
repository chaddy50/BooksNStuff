import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MediaItemCard } from "#/components/MediaItemCard";
import type { DashboardItem } from "#/features/screens/dashboard/dashboard";

interface NextUpCardProps {
	item: DashboardItem;
	cardWidth: string;
}

/**
 * A Next Up card made sortable, without disabling its details link — unlike
 * the custom-view `ReorderableItemCard`, this card has no separate "reorder
 * mode" to navigate away from, so a plain click still has to open the item.
 * `touch-action` is left at its default here rather than `touch-none`: the
 * card sits in a horizontally-scrolling strip, and the touch sensor's own
 * delay/tolerance activation constraint (set where this card is used) is what
 * tells a swipe-to-scroll apart from a held-press-to-drag.
 */
export function NextUpCard({ item, cardWidth }: NextUpCardProps) {
	const { t } = useTranslation();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
				opacity: isDragging ? 0.4 : 1,
			}}
			className={`relative group shrink-0 ${cardWidth}`}
			{...attributes}
			{...listeners}
		>
			<MediaItemCard
				mediaItem={item}
				shouldShowRating={false}
				shouldShowPurchaseStatus
				shouldShowStatus={false}
			/>
			<div
				data-drag-handle
				className="absolute top-1.5 right-1.5 rounded bg-black/60 text-white backdrop-blur-sm p-1 opacity-0 group-hover:opacity-100 pointer-coarse:hidden cursor-grab active:cursor-grabbing"
			>
				<GripVertical className="size-4" />
				<span className="sr-only">{t("dashboard.dragToReorderNextUp")}</span>
			</div>
		</div>
	);
}
