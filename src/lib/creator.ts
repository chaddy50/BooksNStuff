import { MediaItemType } from "#/lib/enums";

/**
 * Lives in lib/ rather than alongside the search server code because the
 * search UI needs it too, and Biome's noRestrictedImports rule bans component
 * imports of *.server modules.
 */
const CREATOR_METADATA_KEY_BY_TYPE: Record<MediaItemType, string> = {
	[MediaItemType.BOOK]: "author",
	[MediaItemType.MOVIE]: "director",
	[MediaItemType.TV_SHOW]: "creator",
	[MediaItemType.PODCAST]: "creator",
	[MediaItemType.VIDEO_GAME]: "developer",
};

/** JSONB key holding the creator's name, which differs per media type. */
export function creatorMetadataKey(type: MediaItemType): string {
	return CREATOR_METADATA_KEY_BY_TYPE[type];
}

/**
 * Pulls the creator's name out of a media item's metadata. The JSONB key
 * differs per media type — a book has an author, a movie a director — so
 * callers that only know the type use this to reach the right one.
 */
export function resolveCreatorName(
	type: MediaItemType,
	metadata: Record<string, unknown>,
): string | null {
	const value = metadata[creatorMetadataKey(type)];
	return typeof value === "string" ? value : null;
}
