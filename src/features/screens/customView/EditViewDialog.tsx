import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type { FilterAndSortOptions, ViewSubject } from "#/database/schema";
import { updateView, type View } from "#/features/screens/customView/view";
import { ViewFilterAndSortForm } from "./ViewFilterAndSortForm";

interface EditViewDialogProps {
	view: View;
	isOpen: boolean;
	onClose: () => void;
	onUpdated: () => void;
	onDelete: () => void;
}

export function EditViewDialog({
	view,
	isOpen,
	onClose,
	onUpdated,
	onDelete,
}: EditViewDialogProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("views.editView")}</DialogTitle>
					<DialogDescription className="sr-only">
						{t("views.editDescription")}
					</DialogDescription>
				</DialogHeader>
				<ViewFilterAndSortForm
					initialName={view.name}
					initialSubject={view.subject as ViewSubject}
					initialFilters={(view.filters ?? {}) as FilterAndSortOptions}
					onSubmit={async ({ name, filters }) => {
						await updateView({ data: { id: view.id, name, filters } });
						await queryClient.invalidateQueries({ queryKey: ["views"] });
						onClose();
						onUpdated();
					}}
					onCancel={onClose}
					onDelete={async () => {
						onDelete();
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}
