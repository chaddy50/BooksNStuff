import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/DeleteButton";
import { DeleteConfirmationDialog } from "#/components/DeleteConfirmationDialog";
import { SaveAndCancelButtons } from "#/components/SaveAndCancelButtons";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	createViewGroup,
	deleteViewGroup,
	renameViewGroup,
	type ViewGroup,
} from "#/features/screens/customView/viewGroup";

interface ViewGroupDialogProps {
	/** Absent when creating a new group. */
	group?: ViewGroup;
	isOpen: boolean;
	onClose: () => void;
}

export function ViewGroupDialog({
	group,
	isOpen,
	onClose,
}: ViewGroupDialogProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const nameInputId = useId();
	const [name, setName] = useState(group?.name ?? "");
	const [isPending, setIsPending] = useState(false);
	const [hasFailed, setHasFailed] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
		null,
	);

	async function handleSave() {
		setIsPending(true);
		setHasFailed(false);
		try {
			if (group) {
				await renameViewGroup({ data: { id: group.id, name } });
			} else {
				await createViewGroup({ data: { name } });
			}
			await queryClient.invalidateQueries({ queryKey: ["viewGroups"] });
			onClose();
		} catch {
			// These handlers are passed straight to onClick, so nothing downstream
			// can catch for us. Staying open with the failure shown beats closing
			// as though the group had been saved.
			setHasFailed(true);
		} finally {
			setIsPending(false);
		}
	}

	function handleDeleteRequested() {
		setIsDeleteDialogOpen(true);
	}

	function handleCancelDelete() {
		setIsDeleteDialogOpen(false);
		setDeleteErrorMessage(null);
	}

	async function handleConfirmDelete() {
		if (!group) return;

		setIsPending(true);
		setDeleteErrorMessage(null);
		try {
			await deleteViewGroup({ data: { id: group.id } });
			// The group's views come back to the top level, so the view list is stale
			// too, not just the group list.
			await queryClient.invalidateQueries({ queryKey: ["viewGroups"] });
			await queryClient.invalidateQueries({ queryKey: ["views"] });
			onClose();
		} catch {
			setDeleteErrorMessage(t("viewGroups.deleteFailed"));
		} finally {
			setIsPending(false);
		}
	}

	return (
		<>
			<Dialog
				open={isOpen}
				onOpenChange={(open) => {
					if (!open) onClose();
				}}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>
							{t(group ? "viewGroups.editGroup" : "viewGroups.createGroup")}
						</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor={nameInputId}>{t("viewGroups.name")}</Label>
						<Input
							id={nameInputId}
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder={t("viewGroups.namePlaceholder")}
						/>
					</div>
					{hasFailed && (
						<p role="alert" className="text-xs text-destructive">
							{t("viewGroups.actionFailed")}
						</p>
					)}
					<div className="flex items-center justify-between pt-2">
						<div>
							{group && (
								<DeleteButton
									onClick={handleDeleteRequested}
									disabled={isPending}
								>
									{t("viewGroups.deleteGroup")}
								</DeleteButton>
							)}
						</div>
						<SaveAndCancelButtons
							onSave={handleSave}
							onCancel={onClose}
							isPending={isPending}
							isSaveDisabled={name.trim().length === 0}
						/>
					</div>
				</DialogContent>
			</Dialog>

			<DeleteConfirmationDialog
				isOpen={isDeleteDialogOpen}
				title={t("viewGroups.deleteTitle")}
				description={t("viewGroups.deleteDescription", {
					name: group?.name ?? "",
				})}
				isDeleting={isPending}
				errorMessage={deleteErrorMessage ?? undefined}
				onCancel={handleCancelDelete}
				onConfirm={handleConfirmDelete}
			/>
		</>
	);
}
