import { useRef, useState } from "react";
import { useUnsavedChangesGuard } from "#/components/hooks/useUnsavedChangesGuard";
import { UnsavedChangesDialog } from "#/components/UnsavedChangesDialog";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import type { InstanceEditFormHandle } from "./components/instance/InstanceEditForm";
import { InstanceList } from "./components/instance/InstanceList";
import { TopBar } from "./components/TopBar";

interface HistoryProps {
	mediaItemDetails: MediaItemDetails;
	isUnsavedChangesGuardEnabled?: () => boolean;
}

export function History(props: HistoryProps) {
	const { mediaItemDetails, isUnsavedChangesGuardEnabled } = props;
	const [idBeingEdited, setIdBeingEdited] = useState<number | "new" | null>(
		null,
	);
	const editorRef = useRef<InstanceEditFormHandle | null>(null);

	const guard = useUnsavedChangesGuard({
		hasUnsavedChanges: () => editorRef.current?.hasUnsavedChanges() ?? false,
		save: () => editorRef.current?.save() ?? Promise.resolve(true),
		isEnabled: isUnsavedChangesGuardEnabled,
	});

	function startEditing(id: number | "new") {
		guard.startEditing(() => setIdBeingEdited(id));
	}

	return (
		<div className="mb-10">
			<TopBar idBeingEdited={idBeingEdited} startEditing={startEditing} />

			<InstanceList
				mediaItemDetails={mediaItemDetails}
				idBeingEdited={idBeingEdited}
				setIdBeingEdited={setIdBeingEdited}
				startEditing={startEditing}
				editorRef={editorRef}
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
