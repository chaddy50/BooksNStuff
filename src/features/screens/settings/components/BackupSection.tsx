import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "#/components/hooks/useToast";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	type BackupData,
	exportBackup,
	importBackup,
} from "#/features/screens/settings/backup";

export function BackupSection() {
	const { t } = useTranslation();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);

	async function handleExport() {
		setIsExporting(true);
		try {
			const data = await exportBackup();
			const json = JSON.stringify(data, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = "media-tracker-backup.json";
			anchor.click();
			URL.revokeObjectURL(url);
		} finally {
			setIsExporting(false);
		}
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		const reader = new FileReader();
		reader.onload = (readerEvent) => {
			try {
				const parsed = JSON.parse(readerEvent.target?.result as string);
				setPendingBackup(parsed as BackupData);
				setIsConfirmOpen(true);
			} catch {
				toast(t("settings.backup.parseError"), { variant: "destructive" });
			}
		};
		reader.readAsText(file);

		// Reset the file input so the same file can be re-selected if needed
		event.target.value = "";
	}

	async function handleConfirmRestore() {
		if (!pendingBackup) {
			return;
		}
		setIsImporting(true);
		try {
			await importBackup({ data: { backup: pendingBackup } });
			await queryClient.invalidateQueries();
			setIsConfirmOpen(false);
			setPendingBackup(null);
			toast(t("settings.backup.success"), { variant: "success" });
		} finally {
			setIsImporting(false);
		}
	}

	function handleCancelRestore() {
		setIsConfirmOpen(false);
		setPendingBackup(null);
	}

	return (
		<section className="flex flex-col gap-4">
			<div>
				<h2 className="text-lg font-semibold">{t("settings.backup.title")}</h2>
				<p className="text-sm text-muted-foreground">
					{t("settings.backup.description")}
				</p>
			</div>

			<div className="flex flex-wrap gap-2">
				<Button onClick={handleExport} disabled={isExporting} variant="outline">
					{isExporting
						? t("settings.backup.exporting")
						: t("settings.backup.export")}
				</Button>

				<Button
					onClick={() => fileInputRef.current?.click()}
					disabled={isImporting}
					variant="outline"
				>
					{t("settings.backup.import")}
				</Button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".json"
					className="hidden"
					onChange={handleFileChange}
				/>
			</div>

			<Dialog
				open={isConfirmOpen}
				onOpenChange={(open) => {
					if (!open) handleCancelRestore();
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("settings.backup.confirmTitle")}</DialogTitle>
						<DialogDescription>
							{t("settings.backup.confirmDescription")}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={handleCancelRestore}
							disabled={isImporting}
						>
							{t("settings.backup.cancel")}
						</Button>
						<Button
							variant="destructive"
							onClick={handleConfirmRestore}
							disabled={isImporting}
						>
							{isImporting
								? t("settings.backup.importing")
								: t("settings.backup.confirm")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
