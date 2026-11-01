import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import type { PodcastEpisode } from "#/features/mediaItemSearch/api/itunes";
import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";
import {
	addPodcastArc,
	fetchEpisodesForFeed,
} from "#/features/mediaItemSearch/mediaItemSearch";
import { FormField } from "#/features/screens/mediaItemDetails/components/metadata/components/editMetadata/FormField";
import { MediaItemStatus } from "#/lib/enums";

type AddMode = {
	mode: "add";
	podcast: ExternalSearchResult;
};

type EditMode = {
	mode: "edit";
	mediaItemId: number;
	currentArcTitle: string;
	feedUrl: string;
	currentEpisodeGuids: string[];
	podcastTitle: string;
	podcastCoverImageUrl?: string;
	creator?: string;
	genres?: string[];
	onArcUpdated?: (
		arcTitle: string,
		updatedMetadata: Record<string, unknown>,
	) => void;
};

type PodcastArcPickerDialogProps = (AddMode | EditMode) & {
	isOpen: boolean;
	onClose: () => void;
};

export function PodcastArcPickerDialog(props: PodcastArcPickerDialogProps) {
	const { isOpen, onClose } = props;
	const { t } = useTranslation();
	const navigate = useNavigate();

	const isEditMode = props.mode === "edit";
	const feedUrl = isEditMode
		? props.feedUrl
		: (props.podcast.metadata?.feedUrl as string | undefined);
	const podcastTitle = isEditMode ? props.podcastTitle : props.podcast.title;
	const currentArcTitle = isEditMode ? props.currentArcTitle : undefined;
	const currentEpisodeGuids = isEditMode
		? props.currentEpisodeGuids
		: undefined;

	const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
	const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [selectedGuids, setSelectedGuids] = useState<Set<string>>(new Set());
	const [arcTitle, setArcTitle] = useState("");
	const [status, setStatus] = useState<string>(MediaItemStatus.BACKLOG);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const [isSubscriberFeedExpanded, setIsSubscriberFeedExpanded] =
		useState(false);
	const [subscriberFeedUrl, setSubscriberFeedUrl] = useState("");
	const [isFewEpisodes, setIsFewEpisodes] = useState(false);

	// Anchor index for shift-click range selection — stored in a ref to avoid re-renders
	const anchorIndexRef = useRef<number | null>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const hasScrolledRef = useRef(false);

	useEffect(() => {
		if (!isOpen || !feedUrl) return;

		setEpisodes([]);
		setSelectedGuids(new Set());
		setArcTitle(currentArcTitle ?? "");
		setStatus(MediaItemStatus.BACKLOG);
		setLoadError(null);
		setSubmitError(null);
		setIsFewEpisodes(false);
		setIsSubscriberFeedExpanded(false);
		setSubscriberFeedUrl("");
		anchorIndexRef.current = null;
		hasScrolledRef.current = false;

		setIsLoadingEpisodes(true);
		fetchEpisodesForFeed({ data: { feedUrl } })
			.then((fetchedEpisodes) => {
				setEpisodes(fetchedEpisodes);
				setIsFewEpisodes(fetchedEpisodes.length <= 1);
				if (currentEpisodeGuids && currentEpisodeGuids.length > 0) {
					setSelectedGuids(new Set(currentEpisodeGuids));
				}
			})
			.catch(() => setLoadError(t("podcast.episodeLoadError")))
			.finally(() => setIsLoadingEpisodes(false));
	}, [isOpen, feedUrl, currentArcTitle, currentEpisodeGuids, t]);

	// Scroll to first selected episode after episodes load
	useEffect(() => {
		if (
			episodes.length === 0 ||
			selectedGuids.size === 0 ||
			hasScrolledRef.current ||
			!listRef.current
		) {
			return;
		}

		const firstSelectedIndex = episodes.findIndex((episode) =>
			selectedGuids.has(episode.guid),
		);
		if (firstSelectedIndex === -1) {
			return;
		}

		const buttons = listRef.current.querySelectorAll("button");
		buttons[firstSelectedIndex]?.scrollIntoView({ block: "start" });
		hasScrolledRef.current = true;
	}, [episodes, selectedGuids]);

	// Auto-fill arc title when exactly one episode is selected (add mode only)
	useEffect(() => {
		if (isEditMode) return;
		if (selectedGuids.size === 1) {
			const selectedGuid = [...selectedGuids][0];
			const selectedEpisode = episodes.find(
				(episode) => episode.guid === selectedGuid,
			);
			if (selectedEpisode) {
				setArcTitle(selectedEpisode.title);
			}
		} else if (selectedGuids.size === 0) {
			setArcTitle("");
		}
	}, [isEditMode, selectedGuids, episodes]);

	function handleEpisodeClick(
		event: React.MouseEvent<HTMLButtonElement>,
		guid: string,
		index: number,
	) {
		if (event.shiftKey && anchorIndexRef.current !== null) {
			const start = Math.min(anchorIndexRef.current, index);
			const end = Math.max(anchorIndexRef.current, index);
			const rangeGuids = episodes
				.slice(start, end + 1)
				.map((episode) => episode.guid);
			const shouldSelect = !selectedGuids.has(guid);

			setSelectedGuids((previous) => {
				const next = new Set(previous);
				for (const rangeGuid of rangeGuids) {
					if (shouldSelect) {
						next.add(rangeGuid);
					} else {
						next.delete(rangeGuid);
					}
				}
				return next;
			});
			// Anchor stays at the original click — don't update it on shift-click
		} else {
			setSelectedGuids((previous) => {
				const next = new Set(previous);
				if (next.has(guid)) {
					next.delete(guid);
				} else {
					next.add(guid);
				}
				return next;
			});
			anchorIndexRef.current = index;
		}
	}

	function formatDuration(minutes: number | undefined): string {
		if (!minutes) return "";
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${remainingMinutes}m`;
		}
		return `${remainingMinutes}m`;
	}

	async function handleLoadSubscriberFeed() {
		const urlToFetch = subscriberFeedUrl.trim();
		if (!urlToFetch) return;

		setEpisodes([]);
		setSelectedGuids(new Set());
		setLoadError(null);
		setIsFewEpisodes(false);
		anchorIndexRef.current = null;
		hasScrolledRef.current = false;

		setIsLoadingEpisodes(true);
		try {
			const fetchedEpisodes = await fetchEpisodesForFeed({
				data: { feedUrl: urlToFetch },
			});
			setEpisodes(fetchedEpisodes);
			setIsFewEpisodes(fetchedEpisodes.length <= 1);
			if (currentEpisodeGuids && currentEpisodeGuids.length > 0) {
				setSelectedGuids(new Set(currentEpisodeGuids));
			}
		} catch {
			setLoadError(t("podcast.episodeLoadError"));
		} finally {
			setIsLoadingEpisodes(false);
		}
	}

	async function handleSubmit() {
		if (selectedGuids.size === 0 || !arcTitle.trim()) return;

		const selectedEpisodes = episodes.filter((episode) =>
			selectedGuids.has(episode.guid),
		);
		const sortedEpisodes = [...selectedEpisodes].sort(
			(episodeA, episodeB) =>
				(episodeA.episodeNumber ?? 0) - (episodeB.episodeNumber ?? 0),
		);

		const totalDuration = sortedEpisodes.reduce(
			(sum, episode) => sum + (episode.durationMinutes ?? 0),
			0,
		);

		const arcMetadata = {
			creator: isEditMode
				? props.creator
				: (props.podcast.metadata?.creator as string | undefined),
			genres: isEditMode
				? props.genres
				: (props.podcast.metadata?.genres as string[] | undefined),
			feedUrl,
			episodeNumbers: sortedEpisodes
				.map((episode) => episode.episodeNumber)
				.filter((number): number is number => number !== undefined),
			episodeTitles: sortedEpisodes.map((episode) => episode.title),
			episodeGuids: sortedEpisodes.map((episode) => episode.guid),
			totalDuration: totalDuration > 0 ? totalDuration : undefined,
			firstPublishedAt: sortedEpisodes[0]?.publishedAt,
			lastPublishedAt: sortedEpisodes[sortedEpisodes.length - 1]?.publishedAt,
		};

		if (!isEditMode) {
			setIsSubmitting(true);
			setSubmitError(null);
			try {
				const { mediaItemId } = await addPodcastArc({
					data: {
						podcastTitle: props.podcast.title,
						podcastCoverImageUrl: props.podcast.coverImageUrl,
						arcTitle: arcTitle.trim(),
						arcMetadata,
						status,
					},
				});
				onClose();
				await navigate({
					to: "/mediaItemDetails/$mediaItemId",
					params: { mediaItemId: String(mediaItemId) },
				});
			} catch {
				setSubmitError(t("podcast.addArcError"));
			} finally {
				setIsSubmitting(false);
			}
		} else {
			// In edit mode, stage the changes locally — the parent EditMetadataDialog
			// will persist everything together when its Save button is clicked.
			props.onArcUpdated?.(arcTitle.trim(), arcMetadata);
			onClose();
		}
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			onClose();
		}
	}

	const isSubmitDisabled =
		selectedGuids.size === 0 || arcTitle.trim() === "" || isSubmitting;

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? t("podcast.editArcTitle") : podcastTitle}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{t("podcast.arcPickerDescription")}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 min-w-0">
					<div className="flex flex-col gap-2">
						<p className="text-sm font-medium">{t("podcast.selectEpisodes")}</p>
						<p className="text-xs text-muted-foreground">
							{t("podcast.shiftClickHint")}
						</p>

						{isLoadingEpisodes && (
							<p className="text-sm text-muted-foreground">
								{t("podcast.loadingEpisodes")}
							</p>
						)}

						{loadError && (
							<p className="text-sm text-destructive">{loadError}</p>
						)}

						{!isLoadingEpisodes && !loadError && episodes.length === 0 && (
							<p className="text-sm text-muted-foreground">
								{t("podcast.noEpisodes")}
							</p>
						)}

						{!isLoadingEpisodes && (
							<div className="flex flex-col gap-1.5">
								{isFewEpisodes && !isSubscriberFeedExpanded && (
									<p className="text-xs text-amber-600 dark:text-amber-400">
										{t("podcast.fewEpisodesHint")}
									</p>
								)}
								<button
									type="button"
									onClick={() =>
										setIsSubscriberFeedExpanded(!isSubscriberFeedExpanded)
									}
									className={`text-xs underline text-left w-fit ${isFewEpisodes && !isSubscriberFeedExpanded ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}
								>
									{isSubscriberFeedExpanded
										? t("podcast.hideSubscriberFeed")
										: t("podcast.useSubscriberFeed")}
								</button>
								{isSubscriberFeedExpanded && (
									<div className="flex gap-2">
										<Input
											value={subscriberFeedUrl}
											onChange={(e) => setSubscriberFeedUrl(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													void handleLoadSubscriberFeed();
												}
											}}
											placeholder={t("podcast.subscriberFeedPlaceholder")}
										/>
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => void handleLoadSubscriberFeed()}
											disabled={!subscriberFeedUrl.trim() || isLoadingEpisodes}
										>
											{t("podcast.loadEpisodes")}
										</Button>
									</div>
								)}
							</div>
						)}

						{episodes.length > 0 && (
							<div
								ref={listRef}
								className="flex flex-col gap-1 overflow-y-auto max-h-64 border rounded-md p-1"
							>
								{episodes.map((episode, index) => {
									const isSelected = selectedGuids.has(episode.guid);
									return (
										<button
											key={episode.guid}
											type="button"
											onClick={(event) =>
												handleEpisodeClick(event, episode.guid, index)
											}
											className={`w-full flex items-start gap-2 p-2 rounded text-left text-sm transition-colors hover:bg-muted/50 ${
												isSelected ? "bg-accent text-accent-foreground" : ""
											}`}
										>
											<span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-current">
												{isSelected && (
													<svg
														aria-hidden="true"
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="3"
														strokeLinecap="round"
														strokeLinejoin="round"
														className="size-3"
													>
														<polyline points="20 6 9 17 4 12" />
													</svg>
												)}
											</span>
											<span className="flex flex-col gap-0.5 min-w-0">
												<span className="font-medium leading-snug truncate">
													{episode.episodeNumber != null
														? `${episode.episodeNumber}. ${episode.title}`
														: episode.title}
												</span>
												<span className="text-xs text-muted-foreground">
													{[
														episode.publishedAt
															? new Date(episode.publishedAt).getFullYear()
															: null,
														formatDuration(episode.durationMinutes),
													]
														.filter(Boolean)
														.join(" · ")}
												</span>
											</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					<FormField label={t("podcast.arcTitle")}>
						<Input
							value={arcTitle}
							onChange={(e) => setArcTitle(e.target.value)}
							placeholder={t("podcast.arcTitlePlaceholder")}
						/>
					</FormField>

					{!isEditMode && (
						<FormField label={t("search.status")}>
							<Select value={status} onValueChange={setStatus}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.values(MediaItemStatus).map((statusValue) => (
										<SelectItem key={statusValue} value={statusValue}>
											{t(`status.${statusValue}`)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FormField>
					)}

					{submitError && (
						<p className="text-sm text-destructive">{submitError}</p>
					)}

					<SaveAndCancelButtons
						onSave={handleSubmit}
						saveLabel={
							isSubmitting
								? t("search.adding")
								: isEditMode
									? t("mediaItemDetails.save")
									: t("search.addToLibrary")
						}
						onCancel={onClose}
						isPending={isSubmitting}
						isSaveDisabled={isSubmitDisabled}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
