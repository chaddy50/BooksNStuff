import { useRouter } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "#/components/hooks/useToast";
import { SaveAndCancelButtons } from "#/components/SaveAndCancelButtons";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import { FormField } from "#/features/screens/mediaItemDetails/components/metadata/components/editMetadata/FormField";
import {
	type SeriesDetails,
	updateSeriesMetadata,
} from "#/features/screens/seriesDetails/seriesDetails";

interface EditSeriesDialogProps {
	seriesDetails: SeriesDetails;
}

export function EditSeriesDialog({ seriesDetails }: EditSeriesDialogProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const { toast } = useToast();

	const [isOpen, setIsOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [name, setName] = useState(seriesDetails.name);
	const [description, setDescription] = useState(
		seriesDetails.description ?? "",
	);
	const [isComplete, setIsComplete] = useState(seriesDetails.isComplete);

	const isCompleteToggleId = useId();

	async function handleSave() {
		setIsSaving(true);
		try {
			await updateSeriesMetadata({
				data: {
					seriesId: seriesDetails.id,
					name,
					description: description || undefined,
					isComplete,
				},
			});
			router.invalidate();
			setIsOpen(false);
		} catch (err) {
			toast(err instanceof Error ? err.message : "Failed to save changes.", {
				variant: "destructive",
			});
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="text-muted-foreground hover:text-foreground"
				onClick={() => setIsOpen(true)}
				aria-label={t("seriesDetails.edit")}
			>
				<Pencil className="size-4" />
			</Button>

			<Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{t("seriesDetails.edit")}</DialogTitle>
						<DialogDescription className="sr-only">
							{t("seriesDetails.editDescription")}
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-4 overflow-y-auto max-h-[65vh] pr-1">
						<FormField label={t("metadata.title")}>
							<Input value={name} onChange={(e) => setName(e.target.value)} />
						</FormField>

						<FormField label={t("metadata.description")}>
							<Textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
							/>
						</FormField>

						<div className="flex items-center gap-3">
							<Switch
								id={isCompleteToggleId}
								checked={isComplete}
								onCheckedChange={setIsComplete}
							/>
							<Label htmlFor={isCompleteToggleId}>
								{t("seriesDetails.complete")}
							</Label>
						</div>
					</div>

					<SaveAndCancelButtons
						onSave={handleSave}
						onCancel={() => setIsOpen(false)}
						isPending={isSaving}
						className="pt-2"
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
