import { useState } from "react";
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
import { MediaItemStatus } from "#/lib/enums";

interface SetOtherStatusButtonProps {
	disabled: boolean;
	errorMessage?: string;
	status: MediaItemStatus;
	onConfirmStatus: (status: MediaItemStatus) => void;
}

export function SetOtherStatusButton({
	disabled,
	errorMessage,
	status,
	onConfirmStatus,
}: SetOtherStatusButtonProps) {
	const { t } = useTranslation();
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	if (
		status === MediaItemStatus.ON_HOLD ||
		status === MediaItemStatus.DROPPED
	) {
		return (
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="sm"
					className="text-muted-foreground"
					onClick={() => onConfirmStatus(MediaItemStatus.IN_PROGRESS)}
					disabled={disabled}
				>
					{t("mediaItemDetails.resume")}
				</Button>
				{errorMessage && (
					<p role="alert" className="text-xs text-destructive">
						{errorMessage}
					</p>
				)}
			</div>
		);
	}

	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				className="text-muted-foreground"
				onClick={() => setIsDialogOpen(true)}
				disabled={disabled}
			>
				{t("mediaItemDetails.setOtherStatus")}
			</Button>
			<Dialog
				open={isDialogOpen}
				onOpenChange={(isOpen) => {
					if (!isOpen) setIsDialogOpen(false);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t("mediaItemDetails.setOtherStatus")}</DialogTitle>
						<DialogDescription>
							{t("mediaItemDetails.setOtherStatusDescription")}
						</DialogDescription>
					</DialogHeader>
					{errorMessage && (
						<p role="alert" className="text-xs text-destructive">
							{errorMessage}
						</p>
					)}
					<DialogFooter className="pt-2">
						<Button
							variant="outline"
							onClick={() => setIsDialogOpen(false)}
							disabled={disabled}
						>
							{t("common.cancel")}
						</Button>
						<Button
							variant="secondary"
							onClick={() => onConfirmStatus(MediaItemStatus.ON_HOLD)}
							disabled={disabled}
						>
							{t("status.on_hold")}
						</Button>
						<Button
							variant="destructive"
							onClick={() => onConfirmStatus(MediaItemStatus.DROPPED)}
							disabled={disabled}
						>
							{t("status.dropped")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
