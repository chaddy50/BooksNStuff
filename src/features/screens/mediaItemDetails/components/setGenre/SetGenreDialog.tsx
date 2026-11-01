import { useEffect, useState } from "react";
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
import {
	GenreField,
	type GenreFieldValue,
} from "#/features/screens/mediaItemDetails/components/metadata/components/editMetadata/GenreField";
import { getGenres, saveMediaItemGenre } from "#/lib/genres/genres";

interface SetGenreDialogProps {
	isOpen: boolean;
	onClose: () => void;
	mediaItemId: number;
	suggestedGenres: string[];
}

export function SetGenreDialog({
	isOpen,
	onClose,
	mediaItemId,
	suggestedGenres,
}: SetGenreDialogProps) {
	const { t } = useTranslation();
	const [genreFieldValue, setGenreFieldValue] = useState<GenreFieldValue>({
		mode: "none",
	});
	const [isSaving, setIsSaving] = useState(false);
	const [existingGenreNames, setExistingGenreNames] = useState<Set<string>>(
		new Set(),
	);

	useEffect(() => {
		getGenres().then((genreList) =>
			setExistingGenreNames(new Set(genreList.map((genre) => genre.name))),
		);
	}, []);

	const isSaveDisabled =
		isSaving ||
		genreFieldValue.mode !== "set" ||
		genreFieldValue.name.trim() === "";

	async function handleSave() {
		if (genreFieldValue.mode !== "set") return;
		setIsSaving(true);
		try {
			await saveMediaItemGenre({
				data: { mediaItemId, genreName: genreFieldValue.name.trim() },
			});
			onClose();
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={() => {}}>
			<DialogContent
				className="sm:max-w-lg"
				showCloseButton={false}
				onEscapeKeyDown={(event) => event.preventDefault()}
				onInteractOutside={(event) => event.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle>{t("genre.promptTitle")}</DialogTitle>
					<DialogDescription>{t("genre.promptDescription")}</DialogDescription>
				</DialogHeader>

				{suggestedGenres.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{suggestedGenres.map((suggestedGenre) => {
							const isNewGenre = !existingGenreNames.has(suggestedGenre);
							return (
								<Button
									key={suggestedGenre}
									type="button"
									size="sm"
									variant={
										genreFieldValue.mode === "set" &&
										genreFieldValue.name === suggestedGenre
											? "default"
											: "outline"
									}
									onClick={() =>
										setGenreFieldValue({ mode: "set", name: suggestedGenre })
									}
								>
									{suggestedGenre}
									{isNewGenre && (
										<span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
											{t("genre.newGenreBadge")}
										</span>
									)}
								</Button>
							);
						})}
					</div>
				)}

				<GenreField initialGenreName={null} onChange={setGenreFieldValue} />

				<DialogFooter>
					<Button onClick={handleSave} disabled={isSaveDisabled}>
						{t("common.save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
