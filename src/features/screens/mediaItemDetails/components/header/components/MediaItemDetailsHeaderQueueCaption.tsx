import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import { InstanceMetaLine } from "#/features/screens/mediaItemDetails/components/InstanceMetaLine";
import { MediaItemStatus } from "#/lib/enums";

interface MediaItemDetailsHeaderQueueCaptionProps {
	status: MediaItemStatus;
	rating: number;
	queueCaptionLabels: string[];
}

export function MediaItemDetailsHeaderQueueCaption({
	status,
	rating,
	queueCaptionLabels,
}: MediaItemDetailsHeaderQueueCaptionProps) {
	if (queueCaptionLabels.length === 0) return null;

	return (
		<div className="flex items-center gap-4">
			<InstanceMetaLine labels={queueCaptionLabels} />
			{status === MediaItemStatus.COMPLETED && <RatingStars rating={rating} />}
		</div>
	);
}
