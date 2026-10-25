import { UnsavedChangesDialog } from "#/components/UnsavedChangesDialog";
import type {
	MediaItemDetails,
	SeriesCompletionConfirmation,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { InstanceList } from "./components/instance/InstanceList";
import { TopBar } from "./components/TopBar";
import type { InstanceEditingState } from "./useInstanceEditingState";

interface HistoryProps {
	mediaItemDetails: MediaItemDetails;
	editingState: InstanceEditingState;
	onSeriesCompletionNeeded: (
		confirmation: SeriesCompletionConfirmation,
	) => void;
}

export function History(props: HistoryProps) {
	const { mediaItemDetails, editingState, onSeriesCompletionNeeded } = props;
	const { idBeingEdited, setIdBeingEdited, editorRef, guard, startEditing } =
		editingState;

	return (
		<div className="mb-10">
			<TopBar idBeingEdited={idBeingEdited} startEditing={startEditing} />

			<InstanceList
				mediaItemDetails={mediaItemDetails}
				idBeingEdited={idBeingEdited}
				setIdBeingEdited={setIdBeingEdited}
				startEditing={startEditing}
				editorRef={editorRef}
				onSeriesCompletionNeeded={onSeriesCompletionNeeded}
			/>

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
