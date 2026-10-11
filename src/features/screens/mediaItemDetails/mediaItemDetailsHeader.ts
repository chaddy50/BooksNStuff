import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemType } from "#/lib/enums";

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

export function getLogProgressLabelKey(
	type: MediaItemType,
	hasUnfinishedInstance: boolean,
): string {
	if (hasUnfinishedInstance) {
		return "mediaItemDetails.updateProgress";
	}
	return START_LABEL_KEY_BY_TYPE[type];
}
