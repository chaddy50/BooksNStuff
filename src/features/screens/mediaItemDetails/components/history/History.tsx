import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { UnsavedChangesDialog } from "#/components/UnsavedChangesDialog";
import { EditEntryModal } from "#/features/screens/mediaItemDetails/components/EditEntryModal";
import type { InstanceEditorState } from "#/features/screens/mediaItemDetails/components/useInstanceEditorState";
import type {
	MediaItemDetails,
	SeriesCompletionConfirmation,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { InstanceList } from "./components/instance/InstanceList";

interface HistoryProps {
	mediaItemDetails: MediaItemDetails;
	editorState: InstanceEditorState;
	totalSeasons?: number;
	pageCount?: number;
	onSeriesCompletionNeeded: (
		confirmation: SeriesCompletionConfirmation,
	) => void;
}

export function History(props: HistoryProps) {
	const {
		mediaItemDetails,
		editorState,
		totalSeasons,
		pageCount,
		onSeriesCompletionNeeded,
	} = props;
	const { guard, openEditInstance, closeModal, modalState, editorRef } =
		editorState;
	const { t } = useTranslation();
	const router = useRouter();

	function handleSaved() {
		router.invalidate();
	}

	const editingInstance =
		modalState?.kind === "edit-instance"
			? mediaItemDetails.instances.find((i) => i.id === modalState.instanceId)
			: undefined;

	return (
		<div>
			<h2 className="text-lg font-semibold mb-4">
				{t("mediaItemDetails.history")}
			</h2>

			<InstanceList
				mediaItemDetails={mediaItemDetails}
				onEdit={openEditInstance}
			/>

			{editingInstance && (
				<EditEntryModal
					ref={editorRef}
					open
					onClose={closeModal}
					mediaItemId={mediaItemDetails.id}
					mediaItemType={mediaItemDetails.type}
					statusChangedAt={mediaItemDetails.statusChangedAt}
					totalSeasons={totalSeasons}
					pageCount={pageCount}
					instance={editingInstance}
					onSaved={handleSaved}
					onSeriesCompletionNeeded={onSeriesCompletionNeeded}
				/>
			)}

			<UnsavedChangesDialog
				open={guard.isPrompting}
				isSaving={guard.isSaving}
				onKeepEditing={guard.keepEditing}
				onDiscard={guard.discard}
				onSaveAndContinue={guard.saveAndContinue}
			/>
		</div>
	);
}
