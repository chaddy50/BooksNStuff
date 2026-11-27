import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useIsMobile } from "#/components/hooks/useIsMobile";
import { ProgressBar } from "#/components/ProgressBar";
import { Button } from "#/components/ui/button";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import { InstanceMetaLine } from "#/features/screens/mediaItemDetails/components/InstanceMetaLine";
import { Artwork } from "#/features/screens/mediaItemDetails/components/metadata/components/Artwork";
import { EditMetadataDialog } from "#/features/screens/mediaItemDetails/components/metadata/components/EditMetadataDialog";
import { PurchasedToggle } from "#/features/screens/mediaItemDetails/components/metadata/components/PurchasedToggle";
import { StatusSelect } from "#/features/screens/mediaItemDetails/components/metadata/components/StatusSelect";
import { Title } from "#/features/screens/mediaItemDetails/components/metadata/components/Title";
import type { InstanceEditorState } from "#/features/screens/mediaItemDetails/components/useInstanceEditorState";
import {
	type MediaItemDetails,
	type SeriesCompletionConfirmation,
	updateMediaItemStatus,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import {
	getLogProgressLabelKey,
	getMostRecentRating,
	getPageCount,
	getQueueCaptionLabels,
	getRereadLabelKey,
	getTotalSeasons,
	getUnfinishedInstance,
} from "#/features/screens/mediaItemDetails/mediaItemDetailsHeader";
import { MediaItemStatus } from "#/lib/enums";
import { getLocalDateString } from "#/lib/utils";
import { ReviewAndCompleteModal } from "./components/ReviewAndCompleteModal";
import { MediaItemDetailsHeaderBackdrop } from "./MediaItemDetailsHeaderBackdrop";
import { MediaItemDetailsHeaderCurrentInstance } from "./MediaItemDetailsHeaderCurrentInstance";
import { MediaItemDetailsHeaderMetaList } from "./MediaItemDetailsHeaderMetaList";
import { MediaItemDetailsHeaderTags } from "./MediaItemDetailsHeaderTags";

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

interface MediaItemDetailsHeaderProps {
	mediaItemDetails: MediaItemDetails;
	editorState: InstanceEditorState;
	onSeriesCompletionNeeded: (
		confirmation: SeriesCompletionConfirmation,
	) => void;
	onRequestDelete: () => void;
	isDeleting: boolean;
}

export function MediaItemDetailsHeader(props: MediaItemDetailsHeaderProps) {
	const {
		mediaItemDetails,
		editorState,
		onSeriesCompletionNeeded,
		onRequestDelete,
		isDeleting,
	} = props;
	const { t } = useTranslation();
	const router = useRouter();
	const isMobile = useIsMobile();
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
	const rating = getMostRecentRating(mediaItemDetails.instances);
	const unfinishedInstance = getUnfinishedInstance(mediaItemDetails.instances);
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
	const totalSeasons = getTotalSeasons(
		mediaItemDetails.type,
		mediaItemDetails.metadata,
	);
	const pageCount = getPageCount(
		mediaItemDetails.type,
		mediaItemDetails.metadata,
	);

	async function handleStatusChange(nextStatus: MediaItemStatus) {
		setIsUpdatingStatus(true);
		try {
			await updateMediaItemStatus({
				data: {
					mediaItemId: mediaItemDetails.id,
					status: nextStatus,
					today: getLocalDateString(new Date()),
				},
			});
			router.invalidate();
		} finally {
			setIsUpdatingStatus(false);
		}
	}

	function handleSaved() {
		router.invalidate();
	}

	const instanceOrStatusContent = unfinishedInstance ? (
		<MediaItemDetailsHeaderCurrentInstance
			instance={unfinishedInstance}
			mediaItemId={mediaItemDetails.id}
			mediaItemType={mediaItemDetails.type}
			status={mediaItemDetails.status}
			statusChangedAt={mediaItemDetails.statusChangedAt}
			pageCount={pageCount}
			onReviewAndComplete={editorState.openReviewAndComplete}
		/>
	) : (
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
					onClick={() => handleStatusChange(MediaItemStatus.IN_PROGRESS)}
					disabled={isUpdatingStatus}
				>
					{t(primaryActionLabelKey as never)}
				</Button>
				{secondaryAction && (
					<Button
						variant="outline"
						onClick={() => handleStatusChange(secondaryAction.targetStatus)}
						disabled={isUpdatingStatus}
					>
						{t(secondaryAction.labelKey as never)}
					</Button>
				)}
			</div>
		</div>
	);

	return (
		<MediaItemDetailsHeaderBackdrop>
			<div className="relative">
				<div className="absolute top-0 right-0">
					<EditMetadataDialog
						mediaItemDetails={mediaItemDetails}
						onSeriesCompletionNeeded={onSeriesCompletionNeeded}
						onRequestDelete={onRequestDelete}
						isDeleting={isDeleting}
					/>
				</div>

				<div className="flex flex-col md:flex-row gap-5">
					<Artwork mediaItemDetails={mediaItemDetails} />

					<div
						className="flex flex-col gap-2 flex-1 min-w-0 pr-10"
						data-testid="media-item-details-identity-column"
					>
						<Title mediaItemDetails={mediaItemDetails} />
						<MediaItemDetailsHeaderMetaList
							mediaItemDetails={mediaItemDetails}
						/>
						<MediaItemDetailsHeaderTags tags={mediaItemDetails.tags} />

						{mediaItemDetails.status !== MediaItemStatus.COMPLETED && (
							<RatingStars rating={rating} />
						)}

						{!isMobile && (
							<div className="mt-3 pt-4 border-t border-border">
								{instanceOrStatusContent}
							</div>
						)}
					</div>
				</div>

				{isMobile && (
					<div className="mt-3 pt-4 -mx-4 px-4 border-t border-border">
						{instanceOrStatusContent}
					</div>
				)}
			</div>

			{unfinishedInstance && (
				<div className="mt-4 md:mt-5 -mx-4 -mb-4 md:-mx-5 md:-mb-5">
					<ProgressBar
						status={MediaItemStatus.IN_PROGRESS}
						progressPercent={unfinishedInstance.progressPercent}
					/>
				</div>
			)}

			{unfinishedInstance &&
				editorState.modalState?.kind === "review-complete" && (
					<ReviewAndCompleteModal
						ref={editorState.editorRef}
						open
						onClose={editorState.closeModal}
						mediaItemId={mediaItemDetails.id}
						mediaItemType={mediaItemDetails.type}
						totalSeasons={totalSeasons}
						instance={unfinishedInstance}
						onSaved={handleSaved}
						onSeriesCompletionNeeded={onSeriesCompletionNeeded}
					/>
				)}
		</MediaItemDetailsHeaderBackdrop>
	);
}
