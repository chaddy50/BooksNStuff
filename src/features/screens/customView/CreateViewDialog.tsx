import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { createView } from "#/features/screens/customView/view";
import { ViewFilterAndSortForm } from "./ViewFilterAndSortForm";

interface CreateViewDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export function CreateViewDialog({ isOpen, onClose }: CreateViewDialogProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("views.newView")}</DialogTitle>
					<DialogDescription className="sr-only">
						{t("views.createDescription")}
					</DialogDescription>
				</DialogHeader>
				<ViewFilterAndSortForm
					onSubmit={async ({ name, subject, filters }) => {
						const created = await createView({
							data: { name, subject, filters },
						});
						await queryClient.invalidateQueries({ queryKey: ["views"] });
						onClose();
						await navigate({
							to: "/views/$viewId",
							params: { viewId: String(created.id) },
						});
					}}
					onCancel={onClose}
				/>
			</DialogContent>
		</Dialog>
	);
}
