import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "#/database/index";
import { creators, mediaItems } from "#/database/schema";
import {
	deriveCreatorRole,
	groupMediaItemTypesByCreatorMetadataKey,
} from "#/lib/creator";
import { computeProfileStats } from "#/lib/queries/profileStats";
import { attachRatingsAndProgress } from "#/lib/queries/ratingsAndProgressQuery.server";

/**
 * Find an existing creator row for (userId, name), or create one with the
 * provided biography. Returns the creatorId.
 *
 * If the creator already exists with a null biography and a non-null biography
 * is provided, the row is updated so repeated backfill runs can fill in bios.
 *
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */
export async function findOrCreateCreator(
	name: string,
	userId: string,
	biography: string | null,
): Promise<number> {
	const [existing] = await db
		.select({ id: creators.id, biography: creators.biography })
		.from(creators)
		.where(and(eq(creators.userId, userId), eq(creators.name, name)));

	if (existing) {
		if (biography && !existing.biography) {
			await db
				.update(creators)
				.set({ biography })
				.where(eq(creators.id, existing.id));
		}
		return existing.id;
	}

	const [inserted] = await db
		.insert(creators)
		.values({ userId, name, biography })
		.returning({ id: creators.id });

	if (!inserted) {
		throw new Error(`Failed to create creator: ${name}`);
	}

	return inserted.id;
}

export async function fetchCreatorDetails(creatorId: number, userId: string) {
	const [row] = await db
		.select()
		.from(creators)
		.where(and(eq(creators.id, creatorId), eq(creators.userId, userId)));

	if (!row) {
		throw new Error(`Creator ${creatorId} not found`);
	}

	const items = await db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			purchaseStatus: mediaItems.purchaseStatus,
			expectedReleaseDate: mediaItems.expectedReleaseDate,
			title: mediaItems.title,
			type: mediaItems.type,
			coverImageUrl: mediaItems.coverImageUrl,
			metadata: mediaItems.metadata,
		})
		.from(mediaItems)
		.where(
			and(eq(mediaItems.creatorId, creatorId), eq(mediaItems.userId, userId)),
		)
		.orderBy(asc(mediaItems.releaseDate), asc(mediaItems.sortTitle));

	const role = deriveCreatorRole(items.map((item) => item.type));

	if (items.length === 0) {
		return { ...row, items: [], stats: computeProfileStats([]), role };
	}

	const itemsWithRatings = await attachRatingsAndProgress(items);

	return {
		...row,
		items: itemsWithRatings,
		stats: computeProfileStats(itemsWithRatings),
		role,
	};
}

export type UpdateCreatorMetadataInput = {
	creatorId: number;
	name: string;
	biography?: string;
};

export async function updateCreatorMetadata(
	data: UpdateCreatorMetadataInput,
	userId: string,
): Promise<void> {
	const { creatorId, name, biography } = data;

	const [current] = await db
		.select({ name: creators.name })
		.from(creators)
		.where(and(eq(creators.id, creatorId), eq(creators.userId, userId)));

	if (!current) {
		throw new Error(`Creator ${creatorId} not found`);
	}

	await db
		.update(creators)
		.set({ name, biography: biography ?? null })
		.where(and(eq(creators.id, creatorId), eq(creators.userId, userId)));

	if (current.name === name) return;

	// On name change, sync the JSONB metadata key for all of this user's linked
	// items. No id-collection query is needed: the item row carries the userId,
	// the type, and the metadata, so each update can scope itself.
	//
	// Note the bare jsonb_set — an item whose metadata is SQL NULL keeps NULL.
	// That is pre-existing behavior, deliberately carried forward unchanged.
	for (const { key, types } of groupMediaItemTypesByCreatorMetadataKey()) {
		await db
			.update(mediaItems)
			.set({
				metadata: sql`jsonb_set(${mediaItems.metadata}, ${sql.raw(`'{${key}}'`)}, ${JSON.stringify(name)}::jsonb)`,
			})
			.where(
				and(
					eq(mediaItems.userId, userId),
					eq(mediaItems.creatorId, creatorId),
					inArray(mediaItems.type, [...types]),
				),
			);
	}
}
