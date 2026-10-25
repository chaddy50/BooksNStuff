import { and, eq, sql } from "drizzle-orm";

import { db } from "#/database/index";
import { mediaItems, series } from "#/database/schema";
import { syncSeriesStatus } from "#/lib/queries/seriesQuery.server";

/**
 * The write half of the series details screen.
 *
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */

export type UpdateSeriesMetadataInput = {
	seriesId: number;
	name: string;
	description?: string;
	isComplete: boolean;
};

export async function updateSeriesMetadata(
	data: UpdateSeriesMetadataInput,
	userId: string,
): Promise<void> {
	const { seriesId, name, description, isComplete } = data;

	const [currentSeries] = await db
		.select({ name: series.name })
		.from(series)
		.where(and(eq(series.id, seriesId), eq(series.userId, userId)));

	await db
		.update(series)
		.set({ name, description: description || null, isComplete })
		.where(and(eq(series.id, seriesId), eq(series.userId, userId)));

	if (!currentSeries || currentSeries.name === name) return;

	// The name changed — sync it into each item's metadata JSONB so the series
	// name shown on media item detail pages stays consistent. `coalesce` matters:
	// jsonb_set on a NULL metadata column returns NULL, which would silently drop
	// the write for any item that has no metadata yet.
	await db
		.update(mediaItems)
		.set({
			metadata: sql`jsonb_set(coalesce(${mediaItems.metadata}, '{}'), '{series}', ${JSON.stringify(name)}::jsonb)`,
		})
		.where(
			and(eq(mediaItems.userId, userId), eq(mediaItems.seriesId, seriesId)),
		);
}

export async function confirmSeriesCompletion(
	seriesId: number,
	userId: string,
): Promise<void> {
	await db
		.update(series)
		.set({ isComplete: true })
		.where(and(eq(series.id, seriesId), eq(series.userId, userId)));
	await syncSeriesStatus(seriesId, userId);
}
