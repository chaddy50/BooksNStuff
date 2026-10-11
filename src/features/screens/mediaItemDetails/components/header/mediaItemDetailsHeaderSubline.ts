import { MediaItemType } from "#/lib/enums";

const CREATOR_FIELD_BY_TYPE: Record<MediaItemType, string> = {
	[MediaItemType.BOOK]: "author",
	[MediaItemType.MOVIE]: "director",
	[MediaItemType.TV_SHOW]: "creator",
	[MediaItemType.PODCAST]: "creator",
	[MediaItemType.VIDEO_GAME]: "developer",
};

/** The headline creator field shown per type: author, director, creator, or developer. */
export function getPrimaryCreatorValue(
	type: MediaItemType,
	metadata: unknown,
): string | undefined {
	if (!metadata) return undefined;
	const metadataRecord = metadata as Record<string, unknown>;
	const value = metadataRecord[CREATOR_FIELD_BY_TYPE[type]];
	return typeof value === "string" ? value : undefined;
}

/** Appends the book number to a series name for books, e.g. "Teixcalaan #1". */
export function getSeriesLabel(
	type: MediaItemType,
	metadata: unknown,
	seriesName: string | null | undefined,
): string | undefined {
	if (!seriesName) return undefined;

	const metadataRecord = metadata as Record<string, unknown> | null;
	const seriesBookNumber =
		type === MediaItemType.BOOK &&
		typeof metadataRecord?.seriesBookNumber === "string"
			? metadataRecord.seriesBookNumber
			: undefined;

	return seriesBookNumber ? `${seriesName} #${seriesBookNumber}` : seriesName;
}
