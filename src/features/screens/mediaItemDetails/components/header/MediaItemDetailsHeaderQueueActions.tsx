import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import { InstanceMetaLine } from "#/features/screens/mediaItemDetails/components/InstanceMetaLine";
import { PurchasedToggle } from "#/features/screens/mediaItemDetails/components/metadata/components/PurchasedToggle";
import { StatusSelect } from "#/features/screens/mediaItemDetails/components/metadata/components/StatusSelect";
import type {
	MediaItemDetails,
	SeriesCompletionConfirmation,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import {
	getLogProgressLabelKey,
	getMostRecentRating,
	getQueueCaptionLabels,
	getRereadLabelKey,
} from "#/features/screens/mediaItemDetails/mediaItemDetailsHeader";
import { MediaItemStatus } from "#/lib/enums";

// Secondary action offered next to the primary Start/Reread button, for each
// status with no unfinished instance.
const SECONDARY_ACTION_BY_STATUS: Partial<
	Record<MediaItemStatus, { targetStatus: MediaItemStatus; labelKey: string }>
> = {
	[MediaItemStatus.BACKLOG]: {
		targetStatus: MediaItemStatus.NEXT_UP,
		labelKey: "status.next_up",
	},
	[MediaItemStatus.NEXT_UP]: {
		targetStatus: MediaItemStatus.BACKLOG,
		labelKey: "status.backlog",
	},
	[MediaItemStatus.WAITING_FOR_NEXT_RELEASE]: {
		targetStatus: MediaItemStatus.NEXT_UP,
		labelKey: "status.next_up",
	},
};

// Backlog and Next Up are a two-item queue (so the usual Status/Purchased
// controls would be redundant with the secondary action above), and a
// finished item's status/purchase state is no longer actionable.
const STATUSES_HIDING_STATUS_CONTROLS: MediaItemStatus[] = [
	MediaItemStatus.BACKLOG,
	MediaItemStatus.NEXT_UP,
	MediaItemStatus.COMPLETED,
];

interface MediaItemDetailsHeaderQueueActionsProps {
	mediaItemDetails: MediaItemDetails;
	isUpdatingStatus: boolean;
	onStatusChange: (status: MediaItemStatus) => void;
	onSeriesCompletionNeeded: (
		confirmation: SeriesCompletionConfirmation,
	) => void;
}

export function MediaItemDetailsHeaderQueueActions({
	mediaItemDetails,
	isUpdatingStatus,
	onStatusChange,
	onSeriesCompletionNeeded,
}: MediaItemDetailsHeaderQueueActionsProps) {
	const { t } = useTranslation();
	const rating = getMostRecentRating(mediaItemDetails.instances);
	const secondaryAction = SECONDARY_ACTION_BY_STATUS[mediaItemDetails.status];
	const shouldHideStatusControls = STATUSES_HIDING_STATUS_CONTROLS.includes(
		mediaItemDetails.status,
	);
	const primaryActionLabelKey =
		mediaItemDetails.status === MediaItemStatus.COMPLETED
			? getRereadLabelKey(mediaItemDetails.type)
			: getLogProgressLabelKey(mediaItemDetails.type);
	const queueCaptionLabels = getQueueCaptionLabels(
		mediaItemDetails.status,
		mediaItemDetails.type,
		mediaItemDetails.instances,
		t as (key: string, options?: Record<string, unknown>) => string,
	);

	return (
		<div className="flex flex-col gap-3">
			{mediaItemDetails.status !== MediaItemStatus.BACKLOG && (
				<h3 className="text-base font-semibold">
					{t(`status.${mediaItemDetails.status}` as never)}
				</h3>
			)}
			{queueCaptionLabels.length > 0 && (
				<div className="flex items-center gap-4">
					<InstanceMetaLine labels={queueCaptionLabels} />
					{mediaItemDetails.status === MediaItemStatus.COMPLETED && (
						<RatingStars rating={rating} />
					)}
				</div>
			)}
			{!shouldHideStatusControls && (
				<div className="flex items-center gap-3">
					<StatusSelect
						mediaItemDetails={mediaItemDetails}
						onSeriesCompletionNeeded={onSeriesCompletionNeeded}
					/>
					<PurchasedToggle mediaItemDetails={mediaItemDetails} />
				</div>
			)}
			<div className="flex items-center gap-2">
				<Button
					onClick={() => onStatusChange(MediaItemStatus.IN_PROGRESS)}
					disabled={isUpdatingStatus}
				>
					{t(primaryActionLabelKey as never)}
				</Button>
				{secondaryAction && (
					<Button
						variant="outline"
						onClick={() => onStatusChange(secondaryAction.targetStatus)}
						disabled={isUpdatingStatus}
					>
						{t(secondaryAction.labelKey as never)}
					</Button>
				)}
			</div>
		</div>
	);
}
