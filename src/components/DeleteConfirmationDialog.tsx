import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";

interface DeleteConfirmationDialogProps {
	isOpen: boolean;
	title: string;
	description: string;
	isDeleting: boolean;
	errorMessage?: string;
	onCancel: () => void;
	onConfirm: () => void;
}

export function DeleteConfirmationDialog(props: DeleteConfirmationDialogProps) {
	const {
		isOpen,
		title,
		description,
		isDeleting,
		errorMessage,
		onCancel,
		onConfirm,
	} = props;
	const { t } = useTranslation();

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(isDialogOpen) => {
				if (!isDialogOpen) {
					onCancel();
				}
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				{errorMessage && (
					<p role="alert" className="text-xs text-destructive">
						{errorMessage}
					</p>
				)}

				<DialogFooter className="pt-2">
					<Button variant="outline" onClick={onCancel} disabled={isDeleting}>
						{t("common.cancel")}
					</Button>
					<Button
						variant="destructive"
						onClick={onConfirm}
						disabled={isDeleting}
					>
						{isDeleting ? t("common.deleting") : t("common.confirmDelete")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
