import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/DeleteButton";
import { DeleteConfirmationDialog } from "#/components/DeleteConfirmationDialog";
import { useDeleteConfirmation } from "#/components/hooks/useDeleteConfirmation";
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

async function saveGroup(
	group: ViewGroup | undefined,
	name: string,
): Promise<void> {
	if (group) {
		await renameViewGroup({ data: { id: group.id, name } });
	} else {
		await createViewGroup({ data: { name } });
	}
}

// skipcq: JS-R1005 - already extracted the save/delete logic; further splitting hurts readability more than it helps
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
	const deleteConfirmation = useDeleteConfirmation({
		onDelete: async () => {
			if (!group) {
				throw new Error("Cannot delete a group that doesn't exist");
			}
			await deleteViewGroup({ data: { id: group.id } });
			// The group's views come back to the top level, so the view list is stale
			// too, not just the group list.
			await queryClient.invalidateQueries({ queryKey: ["viewGroups"] });
			await queryClient.invalidateQueries({ queryKey: ["views"] });
			onClose();
		},
		failureMessage: t("viewGroups.deleteFailed"),
	});

	async function handleSave() {
		setIsPending(true);
		setHasFailed(false);
		try {
			await saveGroup(group, name);
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

	return (
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
					{group ? (
						<DeleteButton
							onClick={deleteConfirmation.requestDelete}
							disabled={isPending || deleteConfirmation.isDeleting}
						>
							{t("viewGroups.deleteGroup")}
						</DeleteButton>
					) : (
						<span />
					)}
					<SaveAndCancelButtons
						onSave={handleSave}
						onCancel={onClose}
						isPending={isPending}
						isSaveDisabled={name.trim().length === 0}
					/>
				</div>

				<DeleteConfirmationDialog
					isOpen={deleteConfirmation.isDialogOpen}
					title={t("viewGroups.deleteTitle")}
					description={t("viewGroups.deleteDescription", {
						name: group?.name ?? "",
					})}
					isDeleting={deleteConfirmation.isDeleting}
					errorMessage={deleteConfirmation.errorMessage}
					onCancel={deleteConfirmation.cancelDelete}
					onConfirm={deleteConfirmation.confirmDelete}
				/>
			</DialogContent>
		</Dialog>
	);
}
