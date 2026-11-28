import { Fragment } from "react";
import { MarkdownTextBlock } from "#/components/MarkdownTextBlock";
import { FictionRatingComments } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/fictionRating/FictionRatingComments";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { InstanceSeasonReviews } from "./InstanceSeasonReviews";

interface InstanceRowExpandedContentProps {
	instance: MediaItemDetails["instances"][number];
}

export function InstanceRowExpandedContent({
	instance,
}: InstanceRowExpandedContentProps) {
	return (
		<Fragment>
			{instance.reviewText && (
				<MarkdownTextBlock text={instance.reviewText} maxLines={5} />
			)}
			{instance.fictionRating && (
				<FictionRatingComments fictionRating={instance.fictionRating} />
			)}
			{instance.seasonReviews && instance.seasonReviews.length > 0 && (
				<InstanceSeasonReviews seasonReviews={instance.seasonReviews} />
			)}
		</Fragment>
	);
}
