import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import { Artwork } from "#/features/screens/mediaItemDetails/components/metadata/components/Artwork";
import { EditMetadataDialog } from "#/features/screens/mediaItemDetails/components/metadata/components/EditMetadataDialog";
import { PurchasedToggle } from "#/features/screens/mediaItemDetails/components/metadata/components/PurchasedToggle";
import { StatusSelect } from "#/features/screens/mediaItemDetails/components/metadata/components/StatusSelect";
import { Title } from "#/features/screens/mediaItemDetails/components/metadata/components/Title";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import {
	getLogProgressLabelKey,
	getMostRecentRating,
	getUnfinishedInstance,
} from "#/features/screens/mediaItemDetails/mediaItemDetailsHeader";
import { MediaItemDetailsHeaderBackdrop } from "./MediaItemDetailsHeaderBackdrop";
import { MediaItemDetailsHeaderSubline } from "./MediaItemDetailsHeaderSubline";
import { MediaItemDetailsHeaderTags } from "./MediaItemDetailsHeaderTags";

interface MediaItemDetailsHeaderProps {
	mediaItemDetails: MediaItemDetails;
	onLogProgress: () => void;
}

export function MediaItemDetailsHeader(props: MediaItemDetailsHeaderProps) {
	const { mediaItemDetails, onLogProgress } = props;
	const { t } = useTranslation();
	const rating = getMostRecentRating(mediaItemDetails.instances);
	const hasUnfinishedInstance = Boolean(
		getUnfinishedInstance(mediaItemDetails.instances),
	);
	const logProgressLabelKey = getLogProgressLabelKey(
		mediaItemDetails.type,
		hasUnfinishedInstance,
	);

	return (
		<MediaItemDetailsHeaderBackdrop
			coverImageUrl={mediaItemDetails.coverImageUrl}
		>
			<div className="flex flex-col md:flex-row gap-6 md:items-end">
				<Artwork mediaItemDetails={mediaItemDetails} />

				<div className="flex flex-col gap-3 flex-1 min-w-0">
					<Title mediaItemDetails={mediaItemDetails}>
						<MediaItemDetailsHeaderSubline
							mediaItemDetails={mediaItemDetails}
						/>
					</Title>
					<MediaItemDetailsHeaderTags tags={mediaItemDetails.tags} />

					<RatingStars rating={rating} isOnDarkBackground />

					<div className="flex items-center gap-3">
						<StatusSelect mediaItemDetails={mediaItemDetails} />
						<PurchasedToggle mediaItemDetails={mediaItemDetails} />
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<Button onClick={onLogProgress}>
						{t(logProgressLabelKey as never)}
					</Button>
					<EditMetadataDialog mediaItemDetails={mediaItemDetails} />
				</div>
			</div>
		</MediaItemDetailsHeaderBackdrop>
	);
}
