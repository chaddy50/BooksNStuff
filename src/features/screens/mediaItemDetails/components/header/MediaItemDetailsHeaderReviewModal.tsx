import type { InstanceEditorState } from "#/features/screens/mediaItemDetails/components/useInstanceEditorState";
import type {
	MediaItemDetails,
	SeriesCompletionConfirmation,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { ReviewAndCompleteModal } from "./components/ReviewAndCompleteModal";

interface MediaItemDetailsHeaderReviewModalProps {
	unfinishedInstance: MediaItemDetails["instances"][number] | undefined;
	editorState: InstanceEditorState;
	mediaItemDetails: MediaItemDetails;
	totalSeasons?: number;
	onSaved: () => void;
	onSeriesCompletionNeeded: (
		confirmation: SeriesCompletionConfirmation,
	) => void;
}

export function MediaItemDetailsHeaderReviewModal({
	unfinishedInstance,
	editorState,
	mediaItemDetails,
	totalSeasons,
	onSaved,
	onSeriesCompletionNeeded,
}: MediaItemDetailsHeaderReviewModalProps) {
	if (
		!unfinishedInstance ||
		editorState.modalState?.kind !== "review-complete"
	) {
		return null;
	}

	return (
		<ReviewAndCompleteModal
			ref={editorState.editorRef}
			open
			onClose={editorState.closeModal}
			mediaItemId={mediaItemDetails.id}
			mediaItemType={mediaItemDetails.type}
			totalSeasons={totalSeasons}
			instance={unfinishedInstance}
			onSaved={onSaved}
			onSeriesCompletionNeeded={onSeriesCompletionNeeded}
		/>
	);
}
