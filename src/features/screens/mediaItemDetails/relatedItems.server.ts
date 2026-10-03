import { and, eq, ilike, inArray, ne, notExists, or, sql } from "drizzle-orm";

import { db } from "#/database/index";
import { mediaItemRelations, mediaItems } from "#/database/schema";
import type {
	MediaItemStatus,
	MediaItemType,
	PurchaseStatus,
} from "#/lib/enums";
import { fetchLatestRatingsByMediaItemId } from "#/lib/queries/ratingsQuery.server";

export type RelatedMediaItem = {
	id: number;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	status: MediaItemStatus;
	purchaseStatus: PurchaseStatus;
	expectedReleaseDate: string | null;
	rating: number;
};

/** The id of whichever side of the pair isn't the item being viewed. */
function otherMediaItemId(mediaItemId: number) {
	return sql<number>`CASE
		WHEN ${mediaItemRelations.mediaItemIdA} = ${mediaItemId}
			THEN ${mediaItemRelations.mediaItemIdB}
		ELSE ${mediaItemRelations.mediaItemIdA}
	END`;
}

export async function getRelatedMediaItems(
	mediaItemId: number,
	userId: string,
): Promise<RelatedMediaItem[]> {
	const rows = await db
		.select({
			id: mediaItems.id,
			title: mediaItems.title,
			type: mediaItems.type,
			coverImageUrl: mediaItems.coverImageUrl,
			status: mediaItems.status,
			purchaseStatus: mediaItems.purchaseStatus,
			expectedReleaseDate: mediaItems.expectedReleaseDate,
		})
		.from(mediaItemRelations)
		.innerJoin(mediaItems, eq(mediaItems.id, otherMediaItemId(mediaItemId)))
		.where(
			and(
				or(
					eq(mediaItemRelations.mediaItemIdA, mediaItemId),
					eq(mediaItemRelations.mediaItemIdB, mediaItemId),
				),
				eq(mediaItems.userId, userId),
			),
		)
		.orderBy(mediaItems.sortTitle);

	const latestRatings = await fetchLatestRatingsByMediaItemId(
		rows.map((row) => row.id),
	);

	return rows.map((row) => ({
		...row,
		rating: latestRatings.get(row.id)?.rating ?? 0,
	}));
}

export type RelatedItemSearchResult = {
	id: number;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
};

const SEARCH_RESULT_LIMIT = 20;

/** True when a `media_item_relations` row already pairs the two items, in either column order. */
function alreadyRelatedCondition(excludeMediaItemId: number) {
	return notExists(
		db
			.select({ one: sql`1` })
			.from(mediaItemRelations)
			.where(
				or(
					and(
						eq(mediaItemRelations.mediaItemIdA, excludeMediaItemId),
						eq(mediaItemRelations.mediaItemIdB, mediaItems.id),
					),
					and(
						eq(mediaItemRelations.mediaItemIdB, excludeMediaItemId),
						eq(mediaItemRelations.mediaItemIdA, mediaItems.id),
					),
				),
			),
	);
}

export async function searchLibraryForRelatedItems(
	query: string,
	excludeMediaItemId: number,
	userId: string,
): Promise<RelatedItemSearchResult[]> {
	if (!query.trim()) {
		return [];
	}

	return db
		.select({
			id: mediaItems.id,
			title: mediaItems.title,
			type: mediaItems.type,
			coverImageUrl: mediaItems.coverImageUrl,
		})
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.userId, userId),
				ne(mediaItems.id, excludeMediaItemId),
				ilike(mediaItems.title, `%${query}%`),
				alreadyRelatedCondition(excludeMediaItemId),
			),
		)
		.orderBy(mediaItems.sortTitle)
		.limit(SEARCH_RESULT_LIMIT);
}

/** Smaller id first, so a pair is stored once regardless of call order. */
function normalizeRelationPair(
	mediaItemId: number,
	relatedMediaItemId: number,
) {
	return mediaItemId < relatedMediaItemId
		? { mediaItemIdA: mediaItemId, mediaItemIdB: relatedMediaItemId }
		: { mediaItemIdA: relatedMediaItemId, mediaItemIdB: mediaItemId };
}

async function requireOwnedItemIds(
	ids: number[],
	userId: string,
): Promise<void> {
	const owned = await db
		.select({ id: mediaItems.id })
		.from(mediaItems)
		.where(and(inArray(mediaItems.id, ids), eq(mediaItems.userId, userId)));

	if (owned.length !== ids.length) {
		throw new Error("Media item not found");
	}
}

export async function addRelatedMediaItem(
	mediaItemId: number,
	relatedMediaItemId: number,
	userId: string,
): Promise<void> {
	if (mediaItemId === relatedMediaItemId) {
		throw new Error("Cannot relate a media item to itself");
	}

	await requireOwnedItemIds([mediaItemId, relatedMediaItemId], userId);

	const pair = normalizeRelationPair(mediaItemId, relatedMediaItemId);
	await db.insert(mediaItemRelations).values(pair).onConflictDoNothing();
}

export async function removeRelatedMediaItem(
	mediaItemId: number,
	relatedMediaItemId: number,
	userId: string,
): Promise<void> {
	await requireOwnedItemIds([mediaItemId], userId);

	const pair = normalizeRelationPair(mediaItemId, relatedMediaItemId);
	await db
		.delete(mediaItemRelations)
		.where(
			and(
				eq(mediaItemRelations.mediaItemIdA, pair.mediaItemIdA),
				eq(mediaItemRelations.mediaItemIdB, pair.mediaItemIdB),
			),
		);
}
