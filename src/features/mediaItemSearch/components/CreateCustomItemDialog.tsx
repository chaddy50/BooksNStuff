import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SaveAndCancelButtons } from "#/components/SaveAndCancelButtons";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { mediaTypeEnum } from "#/database/schema";
import { createCustomItem } from "#/features/mediaItemSearch/mediaItemSearch";
import { BookFields } from "#/features/screens/mediaItemDetails/components/metadata/components/editMetadata/BookFields";
import { FormField } from "#/features/screens/mediaItemDetails/components/metadata/components/editMetadata/FormField";
import { GameFields } from "#/features/screens/mediaItemDetails/components/metadata/components/editMetadata/GameFields";
import { MovieFields } from "#/features/screens/mediaItemDetails/components/metadata/components/editMetadata/MovieFields";
import { TvShowFields } from "#/features/screens/mediaItemDetails/components/metadata/components/editMetadata/TvShowFields";
import { MediaItemType } from "#/lib/enums";
import { releaseYearToDate } from "#/lib/releaseDate";
import { toTitleCase } from "#/lib/utils";

interface CreateCustomItemDialogProps {
	isOpen: boolean;
	onClose: () => void;
	initialTitle?: string;
	initialType?: MediaItemType | null;
}

export function CreateCustomItemDialog({
	isOpen,
	onClose,
	initialTitle,
	initialType,
}: CreateCustomItemDialogProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const [title, setTitle] = useState(initialTitle ?? "");
	const [type, setType] = useState<MediaItemType | null>(null);
	const [description, setDescription] = useState("");
	const [coverImageUrl, setCoverImageUrl] = useState("");
	const [releaseYear, setReleaseYear] = useState("");
	const [typeMetadata, setTypeMetadata] = useState<Record<string, unknown>>({});
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Capture the latest initial values without making them continuous dependencies —
	// we only want to sync them at the moment the dialog opens, not while the user is editing.
	const initialTitleRef = useRef(initialTitle);
	initialTitleRef.current = initialTitle;
	const initialTypeRef = useRef(initialType);
	initialTypeRef.current = initialType;

	useEffect(() => {
		if (isOpen) {
			setTitle(toTitleCase(initialTitleRef.current ?? ""));
			setType(initialTypeRef.current ?? null);
			setDescription("");
			setCoverImageUrl("");
			setReleaseYear("");
			setTypeMetadata({});
			setError(null);
		}
	}, [isOpen]);

	const shouldSubmitBeDisabled =
		title.trim() === "" || type === null || isCreating;

	async function handleCreate() {
		if (shouldSubmitBeDisabled || type === null) return;

		setIsCreating(true);
		setError(null);
		try {
			const { mediaItemId } = await createCustomItem({
				data: {
					type,
					title: title.trim(),
					description: description || undefined,
					coverImageUrl: coverImageUrl || undefined,
					releaseDate: releaseYearToDate(Number(releaseYear)),
					metadata: typeMetadata,
				},
			});
			await navigate({
				to: "/mediaItemDetails/$mediaItemId",
				params: { mediaItemId: String(mediaItemId) },
			});
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create item.");
		} finally {
			setIsCreating(false);
		}
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			onClose();
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("search.createCustomTitle")}</DialogTitle>
					<DialogDescription className="sr-only">
						{t("search.createCustomDescription")}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 overflow-y-auto max-h-[65vh] pr-1">
					<FormField label={t("metadata.title")}>
						<Input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Title"
						/>
					</FormField>

					<FormField label={t("search.type")}>
						<Select
							value={type ?? ""}
							onValueChange={(value) => {
								setType(value as MediaItemType);
								setTypeMetadata({});
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder={t("search.selectType")} />
							</SelectTrigger>
							<SelectContent>
								{mediaTypeEnum.enumValues.map((mediaType) => (
									<SelectItem key={mediaType} value={mediaType}>
										{t(`mediaType.${mediaType}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormField>

					<FormField label={t("metadata.description")}>
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
						/>
					</FormField>

					<FormField label={t("metadata.coverImage")}>
						<Input
							value={coverImageUrl}
							onChange={(e) => setCoverImageUrl(e.target.value)}
							placeholder="https://..."
						/>
					</FormField>

					<FormField label={t("mediaItemDetails.releaseDate")}>
						<Input
							type="number"
							min={-4712}
							max={new Date().getFullYear() + 5}
							placeholder={new Date().getFullYear().toString()}
							value={releaseYear}
							onChange={(e) => setReleaseYear(e.target.value)}
						/>
					</FormField>

					{type === MediaItemType.BOOK && (
						<BookFields rawMetadata={{}} onChange={setTypeMetadata} />
					)}
					{type === MediaItemType.MOVIE && (
						<MovieFields rawMetadata={{}} onChange={setTypeMetadata} />
					)}
					{type === MediaItemType.TV_SHOW && (
						<TvShowFields rawMetadata={{}} onChange={setTypeMetadata} />
					)}
					{type === MediaItemType.VIDEO_GAME && (
						<GameFields rawMetadata={{}} onChange={setTypeMetadata} />
					)}
				</div>

				{error && <p className="text-sm text-destructive">{error}</p>}

				<SaveAndCancelButtons
					onSave={handleCreate}
					saveLabel={
						isCreating ? t("search.creating") : t("search.createCustomTitle")
					}
					onCancel={onClose}
					isPending={isCreating}
					isSaveDisabled={shouldSubmitBeDisabled}
					className="pt-2"
				/>
			</DialogContent>
		</Dialog>
	);
}
