import { useTranslation } from "react-i18next";
import { MarkdownTextBlock } from "#/components/MarkdownTextBlock";
import type { SeasonReview } from "#/database/schema";
import { FictionRatingComments } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/fictionRating/FictionRatingComments";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import { formatDateRange } from "#/lib/utils";

function getSeasonDateRange(seasonReview: SeasonReview) {
	return formatDateRange(
		seasonReview.startedAt || null,
		seasonReview.completedAt || null,
	);
}

interface InstanceSeasonReviewsProps {
	seasonReviews: SeasonReview[];
}

export function InstanceSeasonReviews({
	seasonReviews,
}: InstanceSeasonReviewsProps) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-2 mt-1 pt-2 border-t border-border">
			{[...seasonReviews]
				.sort((a, b) => a.season - b.season)
				.map((seasonReview) => {
					const seasonDateRange = getSeasonDateRange(seasonReview);
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
	);
}
