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

/**
 * Groups media types by their shared JSONB creator-name key, the inverse of
 * CREATOR_METADATA_KEY_BY_TYPE. Callers that rewrite metadata by key (e.g.
 * propagating a creator rename) need the types that share each key.
 */
export function groupMediaItemTypesByCreatorMetadataKey(): ReadonlyArray<{
	key: string;
	types: readonly MediaItemType[];
}> {
	const typesByKey = new Map<string, MediaItemType[]>();
	for (const type of Object.values(MediaItemType)) {
		const key = creatorMetadataKey(type);
		typesByKey.set(key, [...(typesByKey.get(key) ?? []), type]);
	}
	return Array.from(typesByKey, ([key, types]) => ({ key, types }));
}

export type CreatorRole = "author" | "director" | "creator" | "developer";

/**
 * A creator's role for display, derived from the media types of their linked
 * items rather than stored — a creator with mixed item types (rare) gets
 * whichever role their items lean toward, ties broken by metadata-key order.
 */
export function deriveCreatorRole(
	itemTypes: ReadonlyArray<MediaItemType>,
): CreatorRole | null {
	if (itemTypes.length === 0) {
		return null;
	}

	const countByKey = countItemsByCreatorMetadataKey(itemTypes);
	return pickHighestCountKeyInPriorityOrder(countByKey) as CreatorRole;
}

function countItemsByCreatorMetadataKey(
	itemTypes: ReadonlyArray<MediaItemType>,
): Map<string, number> {
	const countByKey = new Map<string, number>();
	for (const type of itemTypes) {
		const key = creatorMetadataKey(type);
		countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
	}
	return countByKey;
}

/** Ties go to whichever key comes first in metadata-key priority order. */
function pickHighestCountKeyInPriorityOrder(
	countByKey: Map<string, number>,
): string | null {
	let winningKey: string | null = null;
	let highestCount = 0;
	for (const { key } of groupMediaItemTypesByCreatorMetadataKey()) {
		const count = countByKey.get(key) ?? 0;
		if (count > highestCount) {
			highestCount = count;
			winningKey = key;
		}
	}
	return winningKey;
}
