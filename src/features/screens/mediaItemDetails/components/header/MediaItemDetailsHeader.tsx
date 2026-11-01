import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { TypeBadge } from "#/components/TypeBadge";
import { Button } from "#/components/ui/button";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import { Artwork } from "#/features/screens/mediaItemDetails/components/metadata/components/Artwork";
import { EditMetadataDialog } from "#/features/screens/mediaItemDetails/components/metadata/components/EditMetadataDialog";
import { PurchasedToggle } from "#/features/screens/mediaItemDetails/components/metadata/components/PurchasedToggle";
import { StatusSelect } from "#/features/screens/mediaItemDetails/components/metadata/components/StatusSelect";
import { Title } from "#/features/screens/mediaItemDetails/components/metadata/components/Title";
import {
	type MediaItemDetails,
	type SeriesCompletionConfirmation,
	updateMediaItemStatus,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import {
	getLogProgressLabelKey,
	getMostRecentRating,
	getUnfinishedInstance,
} from "#/features/screens/mediaItemDetails/mediaItemDetailsHeader";
import { MediaItemStatus } from "#/lib/enums";
import { getLocalDateString } from "#/lib/utils";
import { MediaItemDetailsHeaderBackdrop } from "./MediaItemDetailsHeaderBackdrop";
import { MediaItemDetailsHeaderCreatorLine } from "./MediaItemDetailsHeaderCreatorLine";
import { MediaItemDetailsHeaderCurrentInstance } from "./MediaItemDetailsHeaderCurrentInstance";
import { MediaItemDetailsHeaderSubline } from "./MediaItemDetailsHeaderSubline";
import { MediaItemDetailsHeaderTags } from "./MediaItemDetailsHeaderTags";

interface MediaItemDetailsHeaderProps {
	mediaItemDetails: MediaItemDetails;
	onUpdateProgress: (instanceId: number) => void;
	onSeriesCompletionNeeded: (
		confirmation: SeriesCompletionConfirmation,
	) => void;
}

export function MediaItemDetailsHeader(props: MediaItemDetailsHeaderProps) {
	const { mediaItemDetails, onUpdateProgress, onSeriesCompletionNeeded } =
		props;
	const { t } = useTranslation();
	const router = useRouter();
	const [isStarting, setIsStarting] = useState(false);
	const rating = getMostRecentRating(mediaItemDetails.instances);
	const unfinishedInstance = getUnfinishedInstance(mediaItemDetails.instances);
	const logProgressLabelKey = getLogProgressLabelKey(
		mediaItemDetails.type,
		false,
	);

	async function handleStart() {
		setIsStarting(true);
		try {
			await updateMediaItemStatus({
				data: {
					mediaItemId: mediaItemDetails.id,
					status: MediaItemStatus.IN_PROGRESS,
					today: getLocalDateString(new Date()),
				},
			});
			router.invalidate();
		} finally {
			setIsStarting(false);
		}
	}

	return (
		<MediaItemDetailsHeaderBackdrop>
			<div className="flex flex-col md:flex-row gap-6 md:items-end">
				<Artwork mediaItemDetails={mediaItemDetails} />

				<div className="flex flex-col gap-3 flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<Title mediaItemDetails={mediaItemDetails} />
						<EditMetadataDialog
							mediaItemDetails={mediaItemDetails}
							onSeriesCompletionNeeded={onSeriesCompletionNeeded}
						/>
					</div>
					<div className="flex items-center gap-3 flex-wrap">
						<TypeBadge type={mediaItemDetails.type} className="shrink-0" />
						<MediaItemDetailsHeaderSubline
							mediaItemDetails={mediaItemDetails}
						/>
					</div>
					<MediaItemDetailsHeaderCreatorLine
						mediaItemDetails={mediaItemDetails}
					/>
					<MediaItemDetailsHeaderTags tags={mediaItemDetails.tags} />

					<RatingStars rating={rating} />

					{!unfinishedInstance && (
						<div className="flex items-center gap-3">
							<StatusSelect
								mediaItemDetails={mediaItemDetails}
								onSeriesCompletionNeeded={onSeriesCompletionNeeded}
							/>
							<PurchasedToggle mediaItemDetails={mediaItemDetails} />
						</div>
					)}
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{unfinishedInstance ? (
						<MediaItemDetailsHeaderCurrentInstance
							instance={unfinishedInstance}
							mediaItemType={mediaItemDetails.type}
							status={mediaItemDetails.status}
							statusChangedAt={mediaItemDetails.statusChangedAt}
							onClick={() => onUpdateProgress(unfinishedInstance.id)}
						/>
					) : (
						<Button onClick={handleStart} disabled={isStarting}>
							{t(logProgressLabelKey as never)}
						</Button>
					)}
				</div>
			</div>
		</MediaItemDetailsHeaderBackdrop>
	);
}
