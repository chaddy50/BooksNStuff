import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { MarkdownTextBlock } from "#/components/MarkdownTextBlock";
import { Button } from "#/components/ui/button";
import type { ConsumptionInfo } from "#/database/schema";
import { FictionRatingComments } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/fictionRating/FictionRatingComments";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { formatDateRange } from "#/lib/utils";

export function getConsumptionLabel(
	info: ConsumptionInfo | null,
	t: (key: string) => string,
): string | null {
	if (!info) return null;
	if (info.controlMethod) {
		return `${t(`consumption.gamePlatform.${info.method}`)} · ${t(`consumption.controlMethod.${info.controlMethod}`)}`;
	}
	return t(`consumption.method.${info.method}`);
}

export function getProgressLabel(
	progressPercent: number | null,
	completedAt: string | null,
	t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
	if (completedAt != null) return null;
	if (progressPercent == null) return null;
	return t("mediaItemDetails.progressComplete", {
		percent: Math.round(progressPercent),
	});
}

export function InstanceRow({
	index,
	instance,
	onEdit,
}: {
	index: number;
	instance: MediaItemDetails["instances"][number];
	onEdit: () => void;
}) {
	const { t } = useTranslation();
	const dateRange = formatDateRange(instance.startedAt, instance.completedAt);

	const consumptionLabel = getConsumptionLabel(
		instance.consumptionInfo,
		t as (key: string) => string,
	);
	const progressLabel = getProgressLabel(
		instance.progressPercent,
		instance.completedAt,
		t as (key: string, options?: Record<string, unknown>) => string,
	);
	const metaLabels = [dateRange, consumptionLabel, progressLabel].filter(
		(label): label is string => label !== null,
	);

	return (
		<div className="flex flex-col gap-1.5 p-4 rounded-lg border border-border bg-card">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-3 flex-wrap min-w-0">
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
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={onEdit}
					className="shrink-0 -mt-1 -mr-2"
				>
					{t("mediaItemDetails.edit")}
				</Button>
			</div>
			{instance.reviewText && (
				<MarkdownTextBlock text={instance.reviewText} maxLines={5} />
			)}
			{instance.fictionRating && (
				<FictionRatingComments fictionRating={instance.fictionRating} />
			)}
			{instance.seasonReviews && instance.seasonReviews.length > 0 && (
				<div className="flex flex-col gap-2 mt-1 pt-2 border-t border-border">
					{[...instance.seasonReviews]
						.sort((a, b) => a.season - b.season)
						.map((seasonReview) => {
							const seasonDateRange = formatDateRange(
								seasonReview.startedAt || null,
								seasonReview.completedAt || null,
							);
							return (
								<div key={seasonReview.season} className="flex flex-col gap-1">
									<div className="flex items-center gap-3 flex-wrap">
										<span className="text-sm font-medium text-muted-foreground">
											{t("mediaItemDetails.seasonN", {
												season: seasonReview.season,
											})}
										</span>
										{seasonDateRange && (
											<span className="text-muted-foreground text-sm">
												{seasonDateRange}
											</span>
										)}
										<RatingStars rating={seasonReview.rating} shouldShowValue />
									</div>
									{seasonReview.fictionRating && (
										<FictionRatingComments
											fictionRating={seasonReview.fictionRating}
										/>
									)}
									{seasonReview.reviewText && (
										<MarkdownTextBlock
											text={seasonReview.reviewText}
											maxLines={3}
										/>
									)}
								</div>
							);
						})}
				</div>
			)}
		</div>
	);
}
