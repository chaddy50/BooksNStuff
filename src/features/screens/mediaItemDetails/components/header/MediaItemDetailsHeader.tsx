import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { useIsMobile } from "#/components/hooks/useIsMobile";
import { ProgressBar } from "#/components/ProgressBar";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import { Artwork } from "#/features/screens/mediaItemDetails/components/metadata/components/Artwork";
import { EditMetadataDialog } from "#/features/screens/mediaItemDetails/components/metadata/components/EditMetadataDialog";
import { Title } from "#/features/screens/mediaItemDetails/components/metadata/components/Title";
import type { InstanceEditorState } from "#/features/screens/mediaItemDetails/components/useInstanceEditorState";
import {
	type MediaItemDetails,
	type SeriesCompletionConfirmation,
	updateMediaItemStatus,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import {
	getMostRecentRating,
	getPageCount,
	getTotalSeasons,
	getUnfinishedInstance,
} from "#/features/screens/mediaItemDetails/mediaItemDetailsHeader";
import { MediaItemStatus } from "#/lib/enums";
import { getLocalDateString } from "#/lib/utils";
import { MediaItemDetailsHeaderBackdrop } from "./MediaItemDetailsHeaderBackdrop";
import { MediaItemDetailsHeaderCurrentInstance } from "./MediaItemDetailsHeaderCurrentInstance";
import { MediaItemDetailsHeaderMetaList } from "./MediaItemDetailsHeaderMetaList";
import { MediaItemDetailsHeaderQueueActions } from "./MediaItemDetailsHeaderQueueActions";
import { MediaItemDetailsHeaderReviewModal } from "./MediaItemDetailsHeaderReviewModal";
import { MediaItemDetailsHeaderTags } from "./MediaItemDetailsHeaderTags";

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
	const router = useRouter();
	const isMobile = useIsMobile();
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
	const rating = getMostRecentRating(mediaItemDetails.instances);
	const unfinishedInstance = getUnfinishedInstance(mediaItemDetails.instances);
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
		<MediaItemDetailsHeaderQueueActions
			mediaItemDetails={mediaItemDetails}
			isUpdatingStatus={isUpdatingStatus}
			onStatusChange={handleStatusChange}
			onSeriesCompletionNeeded={onSeriesCompletionNeeded}
		/>
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

			<MediaItemDetailsHeaderReviewModal
				unfinishedInstance={unfinishedInstance}
				editorState={editorState}
				mediaItemDetails={mediaItemDetails}
				totalSeasons={totalSeasons}
				onSaved={handleSaved}
				onSeriesCompletionNeeded={onSeriesCompletionNeeded}
			/>
		</MediaItemDetailsHeaderBackdrop>
	);
}
