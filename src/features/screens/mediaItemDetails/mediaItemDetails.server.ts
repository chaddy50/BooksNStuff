import { and, count, eq, sql } from "drizzle-orm";

import { db } from "#/database/index";
import { creators, mediaItems, series } from "#/database/schema";
import { creatorMetadataKey } from "#/lib/creator";
import type { MediaItemType } from "#/lib/enums";
import { syncSeriesStatus } from "#/lib/queries/seriesQuery.server";

/**
 * The write half of the media item details screen.
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
