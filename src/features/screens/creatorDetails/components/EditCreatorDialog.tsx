import { useRouter } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";
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
import { Textarea } from "#/components/ui/textarea";
import {
	type CreatorDetails,
	updateCreatorMetadata,
} from "#/features/screens/creatorDetails/creatorDetails";
import { FormField } from "#/features/screens/mediaItemDetails/components/metadata/components/editMetadata/FormField";

interface EditCreatorDialogProps {
	creatorDetails: CreatorDetails;
}

export function EditCreatorDialog({ creatorDetails }: EditCreatorDialogProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const { toast } = useToast();

	const [isOpen, setIsOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [name, setName] = useState(creatorDetails.name);
	const [biography, setBiography] = useState(creatorDetails.biography ?? "");

	async function handleSave() {
		setIsSaving(true);
		try {
			await updateCreatorMetadata({
				data: {
					creatorId: creatorDetails.id,
					name,
					biography: biography || undefined,
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
				aria-label={t("creatorDetails.edit")}
			>
				<Pencil className="size-4" />
			</Button>

			<Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{t("creatorDetails.edit")}</DialogTitle>
						<DialogDescription className="sr-only">
							{t("creatorDetails.editDescription")}
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-4 overflow-y-auto max-h-[65vh] pr-1">
						<FormField label={t("metadata.title")}>
							<Input value={name} onChange={(e) => setName(e.target.value)} />
						</FormField>

						<FormField label={t("creatorDetails.biography")}>
							<Textarea
								value={biography}
								onChange={(e) => setBiography(e.target.value)}
								rows={5}
							/>
						</FormField>
					</div>

					<SaveAndCancelButtons
						onSave={handleSave}
						onCancel={() => setIsOpen(false)}
						isPending={isSaving}
						isSaveDisabled={name.trim() === ""}
						className="pt-2"
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
