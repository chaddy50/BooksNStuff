import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { formatDate } from "#/lib/utils";

type Instance = MediaItemDetails["instances"][number];

// `instances` is already ordered newest-first by id, so the first match here
// is the most recently added instance that has a rating.
export function getMostRecentRating(instances: Instance[]): number {
	const mostRecentRatedInstance = instances.find(
		(instance) => instance.rating > 0,
	);
	return mostRecentRatedInstance?.rating ?? 0;
}

export function getUnfinishedInstance(
	instances: Instance[],
): Instance | undefined {
	return instances.find(
		(instance) => instance.startedAt && !instance.completedAt,
	);
}

const START_LABEL_KEY_BY_TYPE: Record<MediaItemType, string> = {
	[MediaItemType.BOOK]: "mediaItemDetails.startReading",
	[MediaItemType.MOVIE]: "mediaItemDetails.startWatching",
	[MediaItemType.TV_SHOW]: "mediaItemDetails.startWatching",
	[MediaItemType.PODCAST]: "mediaItemDetails.startListening",
	[MediaItemType.VIDEO_GAME]: "mediaItemDetails.startPlaying",
};

export function getLogProgressLabelKey(type: MediaItemType): string {
	return START_LABEL_KEY_BY_TYPE[type];
}

const REREAD_LABEL_KEY_BY_TYPE: Record<MediaItemType, string> = {
	[MediaItemType.BOOK]: "mediaItemDetails.reread",
	[MediaItemType.MOVIE]: "mediaItemDetails.rewatch",
	[MediaItemType.TV_SHOW]: "mediaItemDetails.rewatch",
	[MediaItemType.PODCAST]: "mediaItemDetails.relisten",
	[MediaItemType.VIDEO_GAME]: "mediaItemDetails.replay",
};

export function getRereadLabelKey(type: MediaItemType): string {
	return REREAD_LABEL_KEY_BY_TYPE[type];
}

const LAST_CONSUMED_LABEL_KEY_BY_TYPE: Record<MediaItemType, string> = {
	[MediaItemType.BOOK]: "mediaItemDetails.lastRead",
	[MediaItemType.MOVIE]: "mediaItemDetails.lastWatched",
	[MediaItemType.TV_SHOW]: "mediaItemDetails.lastWatched",
	[MediaItemType.PODCAST]: "mediaItemDetails.lastListened",
	[MediaItemType.VIDEO_GAME]: "mediaItemDetails.lastPlayed",
};

export function getLastConsumedLabelKey(type: MediaItemType): string {
	return LAST_CONSUMED_LABEL_KEY_BY_TYPE[type];
}

// `instances` is already ordered newest-first by id, so the first match here
// is the most recently added instance that has a completedAt.
export function getMostRecentCompletedDate(
	instances: Instance[],
): string | undefined {
	const mostRecentCompletedInstance = instances.find(
		(instance) => instance.completedAt,
	);
	return mostRecentCompletedInstance?.completedAt ?? undefined;
}

export function getTotalSeasons(
	type: MediaItemType,
	metadata: unknown,
): number | undefined {
	if (type !== MediaItemType.TV_SHOW) return undefined;
	return (metadata as { seasons?: number } | null)?.seasons;
}

export function getPageCount(
	type: MediaItemType,
	metadata: unknown,
): number | undefined {
	if (type !== MediaItemType.BOOK) return undefined;
	return (metadata as { pageCount?: number } | null)?.pageCount;
}

/** Plain-text status caption shown for a status with no unfinished instance, beneath the status heading — only Done has anything extra to say here. */
export function getQueueCaptionLabels(
	status: MediaItemStatus,
	type: MediaItemType,
	instances: Instance[],
	t: (key: string, options?: Record<string, unknown>) => string,
): string[] {
	if (status !== MediaItemStatus.COMPLETED) return [];
	const date = getMostRecentCompletedDate(instances);
	if (!date) return [];
	return [t(getLastConsumedLabelKey(type), { date: formatDate(date) })];
}
