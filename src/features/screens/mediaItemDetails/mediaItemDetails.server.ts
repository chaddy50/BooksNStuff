import { and, count, desc, eq, sql } from "drizzle-orm";

import { db } from "#/database/index";
import {
	type ConsumptionInfo,
	creators,
	type FictionRating,
	genres,
	mediaItemInstances,
	mediaItems,
	mediaItemTags,
	type SeasonReview,
	series,
	tags,
} from "#/database/schema";
import { creatorMetadataKey } from "#/lib/creator";
import type { MediaItemType } from "#/lib/enums";
import { syncSeriesStatus } from "#/lib/queries/seriesQuery.server";
import { inferStatusFromInstances } from "./mediaItemDetails";
import { getRelatedMediaItems } from "./relatedItems.server";

/**
 * The read and write logic behind the media item details screen.
 *
 * Every mutation here is scoped by `(id, userId)`. Since the item row carries
 * both the user's tracking state and their own copy of the descriptive data, a
 * `mediaItemId` the caller does not own matches zero rows and the write is a
 * no-op — there is no shared row left for one user's edit to reach.
 *
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */

export async function getMediaItemDetailsForUser(id: number, userId: string) {
	const [row] = await db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			purchaseStatus: mediaItems.purchaseStatus,
			expectedReleaseDate: mediaItems.expectedReleaseDate,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
			creatorId: mediaItems.creatorId,
			creatorName: creators.name,
			genreId: mediaItems.genreId,
			genreName: genres.name,
			title: mediaItems.title,
			type: mediaItems.type,
			description: mediaItems.description,
			coverImageUrl: mediaItems.coverImageUrl,
			releaseDate: mediaItems.releaseDate,
			metadata: mediaItems.metadata,
		})
		.from(mediaItems)
		.leftJoin(series, eq(mediaItems.seriesId, series.id))
		.leftJoin(creators, eq(mediaItems.creatorId, creators.id))
		.leftJoin(genres, eq(mediaItems.genreId, genres.id))
		.where(and(eq(mediaItems.id, id), eq(mediaItems.userId, userId)));

	if (!row) throw new Error(`Entry ${id} not found`);

	const instances = await db
		.select({
			id: mediaItemInstances.id,
			rating: mediaItemInstances.rating,
			fictionRating: mediaItemInstances.fictionRating,
			seasonReviews: mediaItemInstances.seasonReviews,
			consumptionInfo: mediaItemInstances.consumptionInfo,
			reviewText: mediaItemInstances.reviewText,
			progressPercent: mediaItemInstances.progressPercent,
			startedAt: mediaItemInstances.startedAt,
			completedAt: mediaItemInstances.completedAt,
		})
		.from(mediaItemInstances)
		.where(eq(mediaItemInstances.mediaItemId, id))
		.orderBy(desc(mediaItemInstances.id));

	const itemTags = await db
		.select({ name: tags.name })
		.from(mediaItemTags)
		.innerJoin(tags, eq(tags.id, mediaItemTags.tagId))
		.where(eq(mediaItemTags.mediaItemId, id))
		.orderBy(tags.name);

	return {
		...row,
		tags: itemTags.map((t) => t.name),
		instances: instances.map((i) => ({
			...i,
			rating: parseFloat(i.rating ?? "") || 0,
		})),
		relatedItems: await getRelatedMediaItems(id, userId),
	};
}

export type SaveInstanceInput = {
	mediaItemId: number;
	instanceId?: number;
	rating?: string;
	fictionRating?: FictionRating;
	reviewText?: string;
	startedAt?: string;
	completedAt?: string;
	progressPercent?: number | null;
	seasonReviews?: SeasonReview[];
	consumptionInfo?: { method: string; controlMethod?: string };
};

/** Empty-string form fields mean "cleared", so they are stored as null too. */
function emptyToNull(value: string | undefined): string | null {
	return value || null;
}

function undefinedToNull<T>(value: T | undefined): T | null {
	return value ?? null;
}

function buildInstanceValues(data: SaveInstanceInput) {
	return {
		rating: undefinedToNull(data.rating),
		fictionRating: undefinedToNull(data.fictionRating),
		seasonReviews: undefinedToNull(data.seasonReviews),
		consumptionInfo: undefinedToNull(
			data.consumptionInfo,
		) as ConsumptionInfo | null,
		reviewText: emptyToNull(data.reviewText),
		startedAt: emptyToNull(data.startedAt),
		completedAt: emptyToNull(data.completedAt),
		progressPercent: undefinedToNull(data.progressPercent),
	};
}

export async function saveInstanceForUser(
	data: SaveInstanceInput,
	userId: string,
): Promise<void> {
	const { mediaItemId, instanceId } = data;

	const [item] = await db
		.select({ seriesId: mediaItems.seriesId })
		.from(mediaItems)
		.where(and(eq(mediaItems.id, mediaItemId), eq(mediaItems.userId, userId)));
	if (!item) throw new Error("Media item not found");

	const values = buildInstanceValues(data);
	if (instanceId) {
		await db
			.update(mediaItemInstances)
			.set(values)
			.where(
				and(
					eq(mediaItemInstances.id, instanceId),
					eq(mediaItemInstances.mediaItemId, mediaItemId),
				),
			);
	} else {
		await db.insert(mediaItemInstances).values({ mediaItemId, ...values });
	}

	const instances = await db
		.select({
			startedAt: mediaItemInstances.startedAt,
			completedAt: mediaItemInstances.completedAt,
		})
		.from(mediaItemInstances)
		.where(eq(mediaItemInstances.mediaItemId, mediaItemId));

	await db
		.update(mediaItems)
		.set({ status: inferStatusFromInstances(instances) })
		.where(and(eq(mediaItems.id, mediaItemId), eq(mediaItems.userId, userId)));

	if (item.seriesId) {
		await syncSeriesStatus(item.seriesId, userId);
	}
}

export type UpdateMediaItemMetadataInput = {
	mediaItemId: number;
	title: string;
	description?: string;
	coverImageUrl?: string;
	releaseDate?: string;
	metadata: unknown;
};

export async function updateMediaItemMetadata(
	data: UpdateMediaItemMetadataInput,
	userId: string,
): Promise<void> {
	await db
		.update(mediaItems)
		.set({
			title: data.title,
			description: data.description || null,
			coverImageUrl: data.coverImageUrl || null,
			releaseDate: data.releaseDate || null,
			metadata: data.metadata as typeof mediaItems.$inferInsert.metadata,
		})
		.where(
			and(eq(mediaItems.id, data.mediaItemId), eq(mediaItems.userId, userId)),
		);
}

export type UpdateMediaItemSeriesInput = {
	mediaItemId: number;
	type: MediaItemType;
	seriesId: number | null;
	newSeriesName?: string;
};

export async function updateMediaItemSeries(
	data: UpdateMediaItemSeriesInput,
	userId: string,
): Promise<void> {
	const [currentItem] = await db
		.select({ seriesId: mediaItems.seriesId })
		.from(mediaItems)
		.where(
			and(eq(mediaItems.id, data.mediaItemId), eq(mediaItems.userId, userId)),
		);

	let resolvedSeriesId = data.seriesId;
	let resolvedSeriesName: string | null = null;

	if (data.newSeriesName) {
		const [newSeries] = await db
			.insert(series)
			.values({ name: data.newSeriesName, type: data.type, userId })
			.returning({ id: series.id });
		if (!newSeries) throw new Error("Failed to create series");
		resolvedSeriesId = newSeries.id;
		resolvedSeriesName = data.newSeriesName;
	} else if (data.seriesId !== null) {
		const [existing] = await db
			.select({ name: series.name })
			.from(series)
			.where(and(eq(series.id, data.seriesId), eq(series.userId, userId)));
		resolvedSeriesName = existing?.name ?? null;
	}

	const itemPredicate = and(
		eq(mediaItems.id, data.mediaItemId),
		eq(mediaItems.userId, userId),
	);

	await db
		.update(mediaItems)
		.set({ seriesId: resolvedSeriesId })
		.where(itemPredicate);

	if (resolvedSeriesName) {
		await db
			.update(mediaItems)
			.set({
				metadata: sql`jsonb_set(coalesce(${mediaItems.metadata}, '{}'), '{series}', ${JSON.stringify(resolvedSeriesName)}::jsonb)`,
			})
			.where(itemPredicate);
	} else {
		await db
			.update(mediaItems)
			.set({ metadata: sql`${mediaItems.metadata} - 'series'` })
			.where(itemPredicate);
	}

	// Sync the old series (item left) and new series (item joined)
	if (currentItem?.seriesId) {
		await syncSeriesStatus(currentItem.seriesId, userId);
	}
	if (resolvedSeriesId && resolvedSeriesId !== currentItem?.seriesId) {
		await syncSeriesStatus(resolvedSeriesId, userId);
	}
}

export type UpdateMediaItemCreatorInput = {
	mediaItemId: number;
	type: MediaItemType;
	creatorId: number | null;
	newCreatorName?: string;
};

export async function updateMediaItemCreator(
	data: UpdateMediaItemCreatorInput,
	userId: string,
): Promise<void> {
	const [currentItem] = await db
		.select({ id: mediaItems.id })
		.from(mediaItems)
		.where(
			and(eq(mediaItems.id, data.mediaItemId), eq(mediaItems.userId, userId)),
		);
	if (!currentItem) {
		throw new Error("Unauthorized");
	}

	let resolvedCreatorId = data.creatorId;
	let resolvedCreatorName: string | null = null;

	if (data.newCreatorName) {
		const [newCreator] = await db
			.insert(creators)
			.values({ name: data.newCreatorName, userId, biography: null })
			.returning({ id: creators.id });
		if (!newCreator) {
			throw new Error("Failed to create creator");
		}
		resolvedCreatorId = newCreator.id;
		resolvedCreatorName = data.newCreatorName;
	} else if (data.creatorId !== null) {
		const [existing] = await db
			.select({ name: creators.name })
			.from(creators)
			.where(and(eq(creators.id, data.creatorId), eq(creators.userId, userId)));
		resolvedCreatorName = existing?.name ?? null;
	}

	const itemPredicate = and(
		eq(mediaItems.id, data.mediaItemId),
		eq(mediaItems.userId, userId),
	);

	await db
		.update(mediaItems)
		.set({ creatorId: resolvedCreatorId })
		.where(itemPredicate);

	// Sync the JSONB metadata field to match the resolved creator name
	const metadataKey = creatorMetadataKey(data.type);

	if (resolvedCreatorName) {
		await db
			.update(mediaItems)
			.set({
				metadata: sql`jsonb_set(coalesce(${mediaItems.metadata}, '{}'), ${sql.raw(`'{${metadataKey}}'`)}, ${JSON.stringify(resolvedCreatorName)}::jsonb)`,
			})
			.where(itemPredicate);
	} else {
		await db
			.update(mediaItems)
			.set({ metadata: sql`${mediaItems.metadata} - ${metadataKey}` })
			.where(itemPredicate);
	}
}

export async function removeFromLibrary(
	mediaItemId: number,
	userId: string,
): Promise<void> {
	const [item] = await db
		.select({ id: mediaItems.id, seriesId: mediaItems.seriesId })
		.from(mediaItems)
		.where(and(eq(mediaItems.id, mediaItemId), eq(mediaItems.userId, userId)));

	if (!item) return;

	// Deleting the item takes its metadata with it and cascades to instances.
	await db.delete(mediaItems).where(eq(mediaItems.id, item.id));

	// If the item belonged to a series, delete the series if now empty,
	// otherwise sync the series status.
	if (!item.seriesId) return;

	const [remaining] = await db
		.select({ itemCount: count() })
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.seriesId, item.seriesId),
				eq(mediaItems.userId, userId),
			),
		);

	if (remaining?.itemCount === 0) {
		await db
			.delete(series)
			.where(and(eq(series.id, item.seriesId), eq(series.userId, userId)));
		return;
	}

	await syncSeriesStatus(item.seriesId, userId);
}
