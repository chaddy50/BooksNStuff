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
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	function requestDelete() {
		setIsDialogOpen(true);
		setErrorMessage(null);
	}

	function cancelDelete() {
		setIsDialogOpen(false);
		setErrorMessage(null);
	}

	async function confirmDelete() {
		setIsDeleting(true);
		setErrorMessage(null);
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
		errorMessage: errorMessage ?? undefined,
		requestDelete,
		cancelDelete,
		confirmDelete,
	};
}
