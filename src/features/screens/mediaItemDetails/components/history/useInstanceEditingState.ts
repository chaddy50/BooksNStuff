import { useRef, useState } from "react";
import { useUnsavedChangesGuard } from "#/components/hooks/useUnsavedChangesGuard";
import type { InstanceEditFormHandle } from "./components/instance/InstanceEditForm";

interface UseInstanceEditingStateOptions {
	isUnsavedChangesGuardEnabled?: () => boolean;
}

export function useInstanceEditingState(
	options: UseInstanceEditingStateOptions = {},
) {
	const { isUnsavedChangesGuardEnabled } = options;
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

	return { idBeingEdited, setIdBeingEdited, editorRef, guard, startEditing };
}

export type InstanceEditingState = ReturnType<typeof useInstanceEditingState>;
