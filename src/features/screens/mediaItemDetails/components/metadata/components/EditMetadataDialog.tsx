import { useRouter } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SaveAndCancelButtons } from "#/components/SaveAndCancelButtons";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { PodcastArcPickerDialog } from "#/features/mediaItemSearch/components/PodcastArcPickerDialog";
import {
	type MediaItemDetails,
	updateMediaItemCreator,
	updateMediaItemMetadata,
	updateMediaItemSeries,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemType } from "#/lib/enums";
import { saveMediaItemGenre } from "#/lib/genres/genres";
import { getReleaseYear, releaseYearToDate } from "#/lib/releaseDate";
import { saveMediaItemTags } from "#/lib/tags";
import { BookFields } from "./editMetadata/BookFields";
import {
	CreatorField,
	type CreatorFieldValue,
} from "./editMetadata/CreatorField";
import { FormField } from "./editMetadata/FormField";
import { GameFields } from "./editMetadata/GameFields";
import { GenreField, type GenreFieldValue } from "./editMetadata/GenreField";
import { MovieFields } from "./editMetadata/MovieFields";
import { SeriesField, type SeriesFieldValue } from "./editMetadata/SeriesField";
import { StatusFields } from "./editMetadata/StatusFields";
import { TvShowFields } from "./editMetadata/TvShowFields";
import { TagsEditor } from "./TagsEditor";

interface EditMetadataDialogProps {
	mediaItemDetails: MediaItemDetails;
}

export function EditMetadataDialog(props: EditMetadataDialogProps) {
	const { mediaItemDetails } = props;
	const { t } = useTranslation();
	const router = useRouter();

	const [isOpen, setIsOpen] = useState(false);
	const [isArcDialogOpen, setIsArcDialogOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const rawMetadata = (mediaItemDetails.metadata ?? {}) as Record<
		string,
		unknown
	>;
	const feedUrl =
		typeof rawMetadata.feedUrl === "string" ? rawMetadata.feedUrl : undefined;

	const [title, setTitle] = useState(mediaItemDetails.title ?? "");
	const [description, setDescription] = useState(
		mediaItemDetails.description ?? "",
	);
	const [coverImageUrl, setCoverImageUrl] = useState(
		mediaItemDetails.coverImageUrl ?? "",
	);
	const [releaseYear, setReleaseYear] = useState(
		getReleaseYear(mediaItemDetails.releaseDate)?.toString() ?? "",
	);
	const [typeMetadata, setTypeMetadata] =
		useState<Record<string, unknown>>(rawMetadata);
	const currentEpisodeGuids = Array.isArray(typeMetadata.episodeGuids)
		? (typeMetadata.episodeGuids as string[])
		: [];
	const [seriesFieldValue, setSeriesFieldValue] = useState<SeriesFieldValue>(
		mediaItemDetails.seriesId !== null &&
			mediaItemDetails.seriesId !== undefined
			? { mode: "existing", seriesId: mediaItemDetails.seriesId }
			: { mode: "none" },
	);
	const [creatorFieldValue, setCreatorFieldValue] = useState<CreatorFieldValue>(
		mediaItemDetails.creatorId !== null &&
			mediaItemDetails.creatorId !== undefined
			? { mode: "existing", creatorId: mediaItemDetails.creatorId }
			: { mode: "none" },
	);
	const [genreFieldValue, setGenreFieldValue] = useState<GenreFieldValue>(
		mediaItemDetails.genreName !== null &&
			mediaItemDetails.genreName !== undefined
			? { mode: "set", name: mediaItemDetails.genreName }
			: { mode: "none" },
	);
	const [pendingTags, setPendingTags] = useState<string[]>(
		mediaItemDetails.tags,
	);

	const isSaveDisabled =
		isSaving ||
		(seriesFieldValue.mode === "new" && seriesFieldValue.name.trim() === "") ||
		(creatorFieldValue.mode === "new" &&
			creatorFieldValue.name.trim() === "") ||
		(genreFieldValue.mode === "set" && genreFieldValue.name.trim() === "");

	async function handleSave() {
		setIsSaving(true);
		setError(null);
		try {
			await updateMediaItemMetadata({
				data: {
					mediaItemId: mediaItemDetails.id,
					title,
					description: description || undefined,
					coverImageUrl: coverImageUrl || undefined,
					releaseDate: releaseYearToDate(Number(releaseYear)),
					metadata: typeMetadata,
				},
			});

			await updateMediaItemSeries({
				data: {
					mediaItemId: mediaItemDetails.id,
					type: mediaItemDetails.type,
					seriesId:
						seriesFieldValue.mode === "existing"
							? seriesFieldValue.seriesId
							: null,
					newSeriesName:
						seriesFieldValue.mode === "new"
							? seriesFieldValue.name.trim()
							: undefined,
				},
			});

			await updateMediaItemCreator({
				data: {
					mediaItemId: mediaItemDetails.id,
					type: mediaItemDetails.type,
					creatorId:
						creatorFieldValue.mode === "existing"
							? creatorFieldValue.creatorId
							: null,
					newCreatorName:
						creatorFieldValue.mode === "new"
							? creatorFieldValue.name.trim()
							: undefined,
				},
			});

			await saveMediaItemGenre({
				data: {
					mediaItemId: mediaItemDetails.id,
					genreName:
						genreFieldValue.mode === "set" ? genreFieldValue.name.trim() : null,
				},
			});

			await saveMediaItemTags({
				data: { mediaItemId: mediaItemDetails.id, tagNames: pendingTags },
			});

			router.invalidate();
			setIsOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save changes.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => setIsOpen(true)}
				aria-label={t("mediaItemDetails.edit")}
				className="text-muted-foreground hover:text-foreground"
			>
				<Pencil />
			</Button>

			<Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{t("mediaItemDetails.edit")}</DialogTitle>
					</DialogHeader>

					<div className="flex flex-col gap-4 overflow-y-auto max-h-[65vh] pr-1">
						<FormField label={t("metadata.title")}>
							<Input value={title} onChange={(e) => setTitle(e.target.value)} />
						</FormField>

						<StatusFields mediaItemDetails={mediaItemDetails} />

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

						<SeriesField
							type={mediaItemDetails.type}
							initialSeriesId={mediaItemDetails.seriesId ?? null}
							onChange={setSeriesFieldValue}
						/>

						<CreatorField
							label={
								mediaItemDetails.type === MediaItemType.BOOK
									? t("metadata.author")
									: mediaItemDetails.type === MediaItemType.MOVIE
										? t("metadata.director")
										: mediaItemDetails.type === MediaItemType.VIDEO_GAME
											? t("metadata.developer")
											: t("metadata.creator")
							}
							initialCreatorId={mediaItemDetails.creatorId ?? null}
							onChange={setCreatorFieldValue}
						/>

						<GenreField
							initialGenreName={mediaItemDetails.genreName ?? null}
							onChange={setGenreFieldValue}
						/>

						{mediaItemDetails.type === MediaItemType.BOOK && (
							<BookFields
								rawMetadata={rawMetadata}
								onChange={setTypeMetadata}
							/>
						)}

						{mediaItemDetails.type === MediaItemType.MOVIE && (
							<MovieFields
								rawMetadata={rawMetadata}
								onChange={setTypeMetadata}
							/>
						)}

						{mediaItemDetails.type === MediaItemType.TV_SHOW && (
							<TvShowFields
								rawMetadata={rawMetadata}
								onChange={setTypeMetadata}
							/>
						)}

						{mediaItemDetails.type === MediaItemType.VIDEO_GAME && (
							<GameFields
								rawMetadata={rawMetadata}
								onChange={setTypeMetadata}
							/>
						)}

						{mediaItemDetails.type === MediaItemType.PODCAST && feedUrl && (
							<FormField label={t("podcast.episodes")}>
								<div className="flex items-center gap-3">
									<span className="text-sm text-muted-foreground">
										{currentEpisodeGuids.length} {t("podcast.episodesCount")}
									</span>
									<Button
										variant="outline"
										size="sm"
										type="button"
										onClick={() => setIsArcDialogOpen(true)}
									>
										{t("podcast.editEpisodes")}
									</Button>
								</div>
							</FormField>
						)}

						<TagsEditor
							pendingTags={pendingTags}
							onPendingTagsChange={setPendingTags}
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<SaveAndCancelButtons
						onSave={handleSave}
						onCancel={() => setIsOpen(false)}
						isPending={isSaving}
						isSaveDisabled={isSaveDisabled}
						className="pt-2"
					/>
				</DialogContent>
			</Dialog>

			{feedUrl && (
				<PodcastArcPickerDialog
					isOpen={isArcDialogOpen}
					onClose={() => setIsArcDialogOpen(false)}
					mode="edit"
					mediaItemId={mediaItemDetails.id}
					currentArcTitle={mediaItemDetails.title ?? ""}
					feedUrl={feedUrl}
					currentEpisodeGuids={currentEpisodeGuids}
					podcastTitle={
						mediaItemDetails.seriesName ?? mediaItemDetails.title ?? ""
					}
					podcastCoverImageUrl={mediaItemDetails.coverImageUrl ?? undefined}
					creator={
						typeof rawMetadata.creator === "string"
							? rawMetadata.creator
							: undefined
					}
					genres={
						Array.isArray(rawMetadata.genres)
							? (rawMetadata.genres as string[])
							: undefined
					}
					onArcUpdated={(newArcTitle, updatedMetadata) => {
						setTitle(newArcTitle);
						setTypeMetadata((previous) =>
							Object.assign({}, previous, updatedMetadata),
						);
						if (typeof updatedMetadata.firstPublishedAt === "string") {
							const year = new Date(
								updatedMetadata.firstPublishedAt,
							).getFullYear();
							if (!Number.isNaN(year)) {
								setReleaseYear(String(year));
							}
						}
					}}
				/>
			)}
		</>
	);
}
