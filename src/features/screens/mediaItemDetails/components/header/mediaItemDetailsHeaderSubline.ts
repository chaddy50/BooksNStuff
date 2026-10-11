import { MediaItemType } from "#/lib/enums";

/** The headline creator field shown per type: author, director, creator, or developer. */
export function getPrimaryCreatorValue(
	type: MediaItemType,
	metadata: unknown,
): string | undefined {
	if (!metadata) return undefined;
	const m = metadata as Record<string, unknown>;

	switch (type) {
		case MediaItemType.BOOK:
			return typeof m.author === "string" ? m.author : undefined;
		case MediaItemType.MOVIE:
			return typeof m.director === "string" ? m.director : undefined;
		case MediaItemType.TV_SHOW:
		case MediaItemType.PODCAST:
			return typeof m.creator === "string" ? m.creator : undefined;
		case MediaItemType.VIDEO_GAME:
			return typeof m.developer === "string" ? m.developer : undefined;
		default:
			return undefined;
	}
}

/** Appends the book number to a series name for books, e.g. "Teixcalaan #1". */
export function getSeriesLabel(
	type: MediaItemType,
	metadata: unknown,
	seriesName: string | null | undefined,
): string | undefined {
	if (!seriesName) return undefined;
	if (type !== MediaItemType.BOOK) return seriesName;

	const m = metadata as Record<string, unknown> | null;
	const seriesBookNumber =
		m && typeof m.seriesBookNumber === "string"
			? m.seriesBookNumber
			: undefined;
	return seriesBookNumber ? `${seriesName} #${seriesBookNumber}` : seriesName;
}
