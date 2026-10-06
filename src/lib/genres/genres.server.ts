import { and, asc, count, eq } from "drizzle-orm";

import { db } from "#/database/index";
import { type Genre, genres, mediaItems } from "#/database/schema";
import {
	fetchLatestRatingsByMediaItemId,
	getLatestRating,
} from "#/lib/queries/ratingsQuery.server";
import type { TaxonomyEntry, TaxonomyMutationResult } from "#/lib/taxonomy";
import {
	isDuplicateNameError,
	removeValueFromViewFilters,
	renameValueInViewFilters,
	requireNonEmptyName,
} from "#/lib/taxonomy.server";

/**
 * Find an existing genre row for (userId, name), or create one.
 * Returns the genreId.
 *
 * This file uses the .server.ts convention — it must never be statically
 * imported by client-side code. Import it only from server function handler
 * bodies or other server-only modules.
 */
export async function findOrCreateGenre(
	userId: string,
	name: string,
): Promise<number> {
	await db.insert(genres).values({ userId, name }).onConflictDoNothing();

	const [row] = await db
		.select({ id: genres.id })
		.from(genres)
		.where(and(eq(genres.userId, userId), eq(genres.name, name)));

	if (!row) {
		throw new Error(`Failed to find or create genre "${name}"`);
	}

	return row.id;
}

export async function fetchGenreDetails(genreId: number, userId: string) {
	const [row] = await db
		.select()
		.from(genres)
		.where(and(eq(genres.id, genreId), eq(genres.userId, userId)));

	if (!row) {
		throw new Error(`Genre ${genreId} not found`);
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
		.where(and(eq(mediaItems.genreId, genreId), eq(mediaItems.userId, userId)))
		.orderBy(asc(mediaItems.releaseDate), asc(mediaItems.sortTitle));

	if (items.length === 0) {
		return { ...row, items: [] };
	}

	const itemIds = items.map((item) => item.id);
	const latestRatings = await fetchLatestRatingsByMediaItemId(itemIds);

	return {
		...row,
		items: items.map((item) => ({
			...item,
			...getLatestRating(item.id, latestRatings),
		})),
	};
}

/**
 * Every genre the user owns, including unused ones, with how many of their items
 * carry it. The user predicate sits in the join rather than the where clause so
 * another user's items can't inflate the count and an unused genre still
 * reports zero.
 */
export async function getGenresWithUsage(
	userId: string,
): Promise<TaxonomyEntry[]> {
	return db
		.select({
			id: genres.id,
			name: genres.name,
			itemCount: count(mediaItems.id),
		})
		.from(genres)
		.leftJoin(
			mediaItems,
			and(eq(mediaItems.genreId, genres.id), eq(mediaItems.userId, userId)),
		)
		.where(eq(genres.userId, userId))
		.groupBy(genres.id)
		.orderBy(asc(genres.name));
}

/**
 * Creates a genre the user asked for by name. Reports a name they already own as
 * a conflict rather than absorbing it, because creating is an explicit intent —
 * unlike `findOrCreateGenre`, which reuses an existing row on purpose.
 *
 * Saved view filters need no rewrite: a name absent from `genres` can only
 * appear in one as a stale entry, and creating the genre legitimately revives it.
 */
export async function createGenre(
	name: string,
	userId: string,
): Promise<TaxonomyMutationResult> {
	const trimmedName = requireNonEmptyName(name);

	const existingGenre = await findGenreByName(trimmedName, userId);
	if (existingGenre !== undefined) {
		return { status: "conflict" };
	}

	return insertGenre(trimmedName, userId);
}

/**
 * Renames one of the user's genres, keeping their saved view filters pointed at
 * it. Rejects a name they already own instead of merging the two genres.
 *
 * Item metadata is deliberately left alone: `media_items.genre_id` is the
 * authoritative genre, and the `metadata.genres` array is provider-seeded data
 * that `saveMediaItemGenre` never syncs either.
 */
export async function renameGenre(
	genreId: number,
	name: string,
	userId: string,
): Promise<TaxonomyMutationResult> {
	const trimmedName = requireNonEmptyName(name);
	const genre = await findOwnedGenre(genreId, userId);

	if (genre.name === trimmedName) {
		return { status: "ok" };
	}

	const conflictingGenre = await findGenreByName(trimmedName, userId);
	if (conflictingGenre !== undefined) {
		return { status: "conflict" };
	}

	const result = await updateGenreName(genreId, trimmedName);
	if (result.status === "conflict") {
		return result;
	}

	await renameValueInViewFilters(userId, "genres", genre.name, trimmedName);
	return { status: "ok" };
}

/**
 * Deletes one of the user's genres. The `media_items.genre_id` foreign key is
 * declared `set null`, so Postgres clears the column on every item that
 * referenced it while the items themselves survive — no manual update needed.
 */
export async function deleteGenre(
	genreId: number,
	userId: string,
): Promise<void> {
	const genre = await findOwnedGenre(genreId, userId);

	await db.delete(genres).where(eq(genres.id, genreId));
	await removeValueFromViewFilters(userId, "genres", genre.name);
}

/**
 * Folds the source genre into the target: every item on the source moves to the
 * target, and the source is deleted. Irreversible.
 *
 * An item has at most one genre, so no collision is possible and the target's
 * item count is exactly the two counts added together.
 */
export async function mergeGenres(
	sourceGenreId: number,
	targetGenreId: number,
	userId: string,
): Promise<void> {
	if (sourceGenreId === targetGenreId) {
		throw new Error("Cannot merge a genre into itself");
	}

	const sourceGenre = await findOwnedGenre(sourceGenreId, userId);
	const targetGenre = await findOwnedGenre(targetGenreId, userId);

	await db.transaction(async (transaction) => {
		// Repointing before the delete keeps the `set null` cascade from firing —
		// otherwise these items would end up with no genre instead of the target.
		await transaction
			.update(mediaItems)
			.set({ genreId: targetGenreId })
			.where(
				and(
					eq(mediaItems.genreId, sourceGenreId),
					eq(mediaItems.userId, userId),
				),
			);

		await transaction.delete(genres).where(eq(genres.id, sourceGenreId));
	});

	// Outside the transaction because the helper closes over the pooled client.
	await renameValueInViewFilters(
		userId,
		"genres",
		sourceGenre.name,
		targetGenre.name,
	);
}

// ---- Private helpers

async function findOwnedGenre(genreId: number, userId: string): Promise<Genre> {
	const [genre] = await db
		.select()
		.from(genres)
		.where(and(eq(genres.id, genreId), eq(genres.userId, userId)));

	if (!genre) {
		throw new Error(`Genre ${genreId} not found`);
	}

	return genre;
}

async function findGenreByName(
	name: string,
	userId: string,
): Promise<Genre | undefined> {
	const [genre] = await db
		.select()
		.from(genres)
		.where(and(eq(genres.userId, userId), eq(genres.name, name)));

	return genre;
}

async function insertGenre(
	name: string,
	userId: string,
): Promise<TaxonomyMutationResult> {
	try {
		await db.insert(genres).values({ userId, name });
	} catch (error) {
		if (isDuplicateNameError(error)) {
			return { status: "conflict" };
		}
		throw error;
	}

	return { status: "ok" };
}

async function updateGenreName(
	genreId: number,
	name: string,
): Promise<TaxonomyMutationResult> {
	try {
		await db.update(genres).set({ name }).where(eq(genres.id, genreId));
	} catch (error) {
		if (isDuplicateNameError(error)) {
			return { status: "conflict" };
		}
		throw error;
	}

	return { status: "ok" };
}
