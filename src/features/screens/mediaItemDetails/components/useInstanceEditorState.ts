import { useRef, useState } from "react";
import { useUnsavedChangesGuard } from "#/components/hooks/useUnsavedChangesGuard";

export type InstanceModalState =
	| { kind: "review-complete" }
	| { kind: "edit-instance"; instanceId: number }
	| null;

export interface InstanceEditorHandle {
	hasUnsavedChanges: () => boolean;
	save: () => Promise<boolean>;
}

interface UseInstanceEditorStateOptions {
	isUnsavedChangesGuardEnabled?: () => boolean;
}

export function useInstanceEditorState(
	options: UseInstanceEditorStateOptions = {},
) {
	const { isUnsavedChangesGuardEnabled } = options;
	const [modalState, setModalState] = useState<InstanceModalState>(null);
	const editorRef = useRef<InstanceEditorHandle | null>(null);

	const guard = useUnsavedChangesGuard({
		hasUnsavedChanges: () => editorRef.current?.hasUnsavedChanges() ?? false,
		save: () => editorRef.current?.save() ?? Promise.resolve(true),
		isEnabled: isUnsavedChangesGuardEnabled,
	});

	function open(nextState: InstanceModalState) {
		guard.startEditing(() => setModalState(nextState));
	}

	function openReviewAndComplete() {
		open({ kind: "review-complete" });
	}

	function openEditInstance(instanceId: number) {
		open({ kind: "edit-instance", instanceId });
	}

	function closeModal() {
		guard.startEditing(() => setModalState(null));
	}

	return {
		modalState,
		editorRef,
		guard,
		openReviewAndComplete,
		openEditInstance,
		closeModal,
	};
}

export type InstanceEditorState = ReturnType<typeof useInstanceEditorState>;
