import { useState } from "react";

interface UseDeleteConfirmationOptions {
	onDelete: () => Promise<void>;
	failureMessage: string;
}

interface UseDeleteConfirmationResult {
	isDialogOpen: boolean;
	isDeleting: boolean;
	errorMessage: string | undefined;
	requestDelete: () => void;
	cancelDelete: () => void;
	confirmDelete: () => Promise<void>;
}

export function useDeleteConfirmation({
	onDelete,
	failureMessage,
}: UseDeleteConfirmationOptions): UseDeleteConfirmationResult {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | undefined>();

	function requestDelete() {
		setIsDialogOpen(true);
		setErrorMessage(undefined);
	}

	function cancelDelete() {
		setIsDialogOpen(false);
		setErrorMessage(undefined);
	}

	async function confirmDelete() {
		setIsDeleting(true);
		setErrorMessage(undefined);
		try {
			await onDelete();
		} catch {
			setErrorMessage(failureMessage);
		} finally {
			setIsDeleting(false);
		}
	}

	return {
		isDialogOpen,
		isDeleting,
		errorMessage,
		requestDelete,
		cancelDelete,
		confirmDelete,
	};
}
