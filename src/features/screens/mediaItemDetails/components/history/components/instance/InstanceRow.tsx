import { ChevronDown, Pencil } from "lucide-react";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { MarkdownTextBlock } from "#/components/MarkdownTextBlock";
import { Button } from "#/components/ui/button";
import { InstanceSeasonReviews } from "#/features/screens/mediaItemDetails/components/history/components/instance/components/InstanceSeasonReviews";
import { FictionRatingComments } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/fictionRating/FictionRatingComments";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import { getInstanceMetaLabels } from "#/features/screens/mediaItemDetails/instanceMetaLabels";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import type { MediaItemStatus } from "#/lib/enums";
import { cn } from "#/lib/utils";

export function InstanceRow({
	index,
	instance,
	status,
	statusChangedAt,
	onEdit,
}: {
	index: number;
	instance: MediaItemDetails["instances"][number];
	status: MediaItemStatus;
	statusChangedAt: string | null;
	onEdit: () => void;
}) {
	const { t } = useTranslation();
	const [isExpanded, setIsExpanded] = useState(false);
	const metaLabels = getInstanceMetaLabels(
		instance,
		status,
		statusChangedAt,
		t as (key: string, options?: Record<string, unknown>) => string,
	);
	const hasExpandableContent =
		Boolean(instance.reviewText) ||
		Boolean(instance.fictionRating) ||
		Boolean(instance.seasonReviews?.length);

	const summaryContent = (
		<Fragment>
			{hasExpandableContent && (
				<ChevronDown
					aria-hidden="true"
					className={cn(
						"size-4 text-muted-foreground shrink-0 transition-transform",
						isExpanded && "rotate-180",
					)}
				/>
			)}
			<span className="text-sm font-medium text-muted-foreground">
				#{index}
			</span>
			<span className="text-muted-foreground text-sm">
				{metaLabels.map((label, index) => (
					<Fragment key={label}>
						{index > 0 && (
							<span className="mx-1.5" aria-hidden="true">
								·
							</span>
						)}
						<span>{label}</span>
					</Fragment>
				))}
			</span>
			<RatingStars rating={instance.rating} shouldShowValue />
		</Fragment>
	);

	return (
		<div className="flex flex-col gap-1.5 p-4 rounded-lg border border-border bg-card">
			<div className="flex items-start justify-between gap-2">
				{hasExpandableContent ? (
					<button
						type="button"
						data-testid="instance-row-summary-toggle"
						onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
						className="flex items-center gap-3 flex-wrap min-w-0 text-left"
					>
						{summaryContent}
					</button>
				) : (
					<div className="flex items-center gap-3 flex-wrap min-w-0">
						{summaryContent}
					</div>
				)}
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onEdit}
					aria-label={t("mediaItemDetails.edit")}
					className="text-muted-foreground shrink-0 -mt-1 -mr-2"
				>
					<Pencil />
				</Button>
			</div>
			{isExpanded && instance.reviewText && (
				<MarkdownTextBlock text={instance.reviewText} maxLines={5} />
			)}
			{isExpanded && instance.fictionRating && (
				<FictionRatingComments fictionRating={instance.fictionRating} />
			)}
			{isExpanded &&
				instance.seasonReviews &&
				instance.seasonReviews.length > 0 && (
					<InstanceSeasonReviews seasonReviews={instance.seasonReviews} />
				)}
		</div>
	);
}
