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

interface SeriesCompletionPromptDialogProps {
	seriesName: string | null;
	isResolving: boolean;
	onMarkWaiting: () => void;
	onMarkComplete: () => void;
}

export function SeriesCompletionPromptDialog(
	props: SeriesCompletionPromptDialogProps,
) {
	const { seriesName, isResolving, onMarkWaiting, onMarkComplete } = props;
	const { t } = useTranslation();

	return (
		<Dialog
			open={seriesName !== null}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					onMarkWaiting();
				}
			}}
		>
			<DialogContent showCloseButton={false} className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{t("seriesCompletionPrompt.title", { seriesName })}
					</DialogTitle>
					<DialogDescription>
						{t("seriesCompletionPrompt.description")}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="pt-2">
					<Button
						variant="outline"
						size="sm"
						onClick={onMarkWaiting}
						disabled={isResolving}
					>
						{t("seriesCompletionPrompt.markWaiting")}
					</Button>
					<Button size="sm" onClick={onMarkComplete} disabled={isResolving}>
						{t("seriesCompletionPrompt.markComplete")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
