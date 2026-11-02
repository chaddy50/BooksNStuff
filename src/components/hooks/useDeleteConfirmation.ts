import { useState } from "react";
import { useToast } from "#/components/hooks/useToast";

interface UseDeleteConfirmationOptions {
	onDelete: () => Promise<void>;
	failureMessage: string;
}

interface UseDeleteConfirmationResult {
	isDialogOpen: boolean;
	isDeleting: boolean;
	requestDelete: () => void;
	cancelDelete: () => void;
	confirmDelete: () => Promise<void>;
}

export function useDeleteConfirmation({
	onDelete,
	failureMessage,
}: UseDeleteConfirmationOptions): UseDeleteConfirmationResult {
	const { toast } = useToast();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	function requestDelete() {
		setIsDialogOpen(true);
	}

	function cancelDelete() {
		setIsDialogOpen(false);
	}

	async function confirmDelete() {
		setIsDeleting(true);
		try {
			await onDelete();
		} catch {
			toast(failureMessage, { variant: "destructive" });
		} finally {
			setIsDeleting(false);
		}
	}

	return {
		isDialogOpen,
		isDeleting,
		requestDelete,
		cancelDelete,
		confirmDelete,
	};
}
