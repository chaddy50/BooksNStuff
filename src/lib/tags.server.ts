import { and, asc, count, eq, inArray } from "drizzle-orm";

import { db } from "#/database/index";
import { mediaItems, mediaItemTags, type Tag, tags } from "#/database/schema";
import type { TagWithUsageCount } from "#/lib/tags";
import type { TaxonomyMutationResult } from "#/lib/taxonomy";
import {
	isDuplicateNameError,
	removeValueFromViewFilters,
	renameValueInViewFilters,
	requireNonEmptyName,
} from "#/lib/taxonomy.server";

/**
 * The server-only half of the tags feature. It lives apart from `tags.ts`
 * because that module is imported by the client: a `createServerFn` handler body
 * is stripped from the client bundle, but a plain exported function is not, so
 * anything reaching into the database has to sit here.
 */

export async function fetchTags(userId: string): Promise<Tag[]> {
	return db
		.select()
		.from(tags)
		.where(eq(tags.userId, userId))
		.orderBy(asc(tags.name));
}

/** Every tag the user owns, including unused ones, with how many items carry it. */
export async function getTagsWithUsage(
	userId: string,
): Promise<TagWithUsageCount[]> {
	return db
		.select({
			id: tags.id,
			userId: tags.userId,
			name: tags.name,
			createdAt: tags.createdAt,
			itemCount: count(mediaItemTags.tagId),
		})
		.from(tags)
		.leftJoin(mediaItemTags, eq(mediaItemTags.tagId, tags.id))
		.where(eq(tags.userId, userId))
		.groupBy(tags.id)
		.orderBy(asc(tags.name));
}

/**
 * Replaces a media item's tags with `tagNames`, creating any that don't exist
 * yet. Unlike `createTag`, a name the user already has is reused rather than
 * reported — attaching an existing tag is the normal case here.
 */
export async function saveMediaItemTags(
	mediaItemId: number,
	tagNames: string[],
	userId: string,
): Promise<void> {
	await requireOwnedMediaItem(mediaItemId, userId);
	const resolvedTagIds = await upsertTagNames(tagNames, userId);

	// Associations are replaced wholesale rather than diffed against the old set.
	await db
		.delete(mediaItemTags)
		.where(eq(mediaItemTags.mediaItemId, mediaItemId));

	if (resolvedTagIds.length === 0) {
		return;
	}

	await db
		.insert(mediaItemTags)
		.values(resolvedTagIds.map((tagId) => ({ mediaItemId, tagId })));
}

/**
 * Creates a tag the user asked for by name. Reports a name they already own as
 * a conflict rather than absorbing it, because creating is an explicit intent —
 * silently doing nothing would read as a broken button.
 *
 * Saved view filters need no rewrite: a name absent from `tags` can only appear
 * in one as a stale entry, and creating the tag legitimately revives it.
 */
export async function createTag(
	name: string,
	userId: string,
): Promise<TaxonomyMutationResult> {
	const trimmedName = requireNonEmptyName(name);

	const existingTag = await findTagByName(trimmedName, userId);
	if (existingTag !== undefined) {
		return { status: "conflict" };
	}

	return insertTag(trimmedName, userId);
}

/**
 * Renames one of the user's tags, keeping their saved view filters pointed at
 * it. Rejects a name they already own instead of merging the two tags.
 */
export async function renameTag(
	tagId: number,
	name: string,
	userId: string,
): Promise<TaxonomyMutationResult> {
	const trimmedName = requireNonEmptyName(name);
	const tag = await findOwnedTag(tagId, userId);

	if (tag.name === trimmedName) {
		return { status: "ok" };
	}

	const conflictingTag = await findTagByName(trimmedName, userId);
	if (conflictingTag !== undefined) {
		return { status: "conflict" };
	}

	const result = await updateTagName(tagId, trimmedName);
	if (result.status === "conflict") {
		return result;
	}

	await renameValueInViewFilters(userId, "tags", tag.name, trimmedName);
	return { status: "ok" };
}

/**
 * Deletes one of the user's tags. The `media_item_tags` foreign key cascades, so
 * the tag drops off every item carrying it while the items themselves survive.
 */
export async function deleteTag(tagId: number, userId: string): Promise<void> {
	const tag = await findOwnedTag(tagId, userId);

	await db.delete(tags).where(eq(tags.id, tagId));
	await removeValueFromViewFilters(userId, "tags", tag.name);
}

/**
 * Folds the source tag into the target: every item carrying the source ends up
 * carrying the target, and the source is deleted. Irreversible.
 *
 * An item already carrying both ends up with one link, not two, so the target's
 * item count can come out lower than the two counts added together.
 */
export async function mergeTags(
	sourceTagId: number,
	targetTagId: number,
	userId: string,
): Promise<void> {
	if (sourceTagId === targetTagId) {
		throw new Error("Cannot merge a tag into itself");
	}

	const sourceTag = await findOwnedTag(sourceTagId, userId);
	const targetTag = await findOwnedTag(targetTagId, userId);

	await db.transaction(async (transaction) => {
		const sourceLinks = await transaction
			.select({ mediaItemId: mediaItemTags.mediaItemId })
			.from(mediaItemTags)
			.where(eq(mediaItemTags.tagId, sourceTagId));

		if (sourceLinks.length > 0) {
			// An item carrying both tags already has the target row, and the
			// composite primary key would reject the duplicate — let it fall through.
			await transaction
				.insert(mediaItemTags)
				.values(
					sourceLinks.map(({ mediaItemId }) => ({
						mediaItemId,
						tagId: targetTagId,
					})),
				)
				.onConflictDoNothing();
		}

		// Deleting the source cascades its remaining junction rows away.
		await transaction.delete(tags).where(eq(tags.id, sourceTagId));
	});

	// Outside the transaction because the helper closes over the pooled client.
	// A crash in this window leaves a saved view naming a tag that is gone, which
	// is cosmetic and matches what rename and delete already risk.
	await renameValueInViewFilters(
		userId,
		"tags",
		sourceTag.name,
		targetTag.name,
	);
}

// ---- Private helpers

async function requireOwnedMediaItem(
	mediaItemId: number,
	userId: string,
): Promise<void> {
	const [item] = await db
		.select({ id: mediaItems.id })
		.from(mediaItems)
		.where(and(eq(mediaItems.id, mediaItemId), eq(mediaItems.userId, userId)));

	if (!item) {
		throw new Error("Media item not found");
	}
}

async function findOwnedTag(tagId: number, userId: string): Promise<Tag> {
	const [tag] = await db
		.select()
		.from(tags)
		.where(and(eq(tags.id, tagId), eq(tags.userId, userId)));

	if (!tag) {
		throw new Error(`Tag ${tagId} not found`);
	}

	return tag;
}

async function findTagByName(
	name: string,
	userId: string,
): Promise<Tag | undefined> {
	const [tag] = await db
		.select()
		.from(tags)
		.where(and(eq(tags.userId, userId), eq(tags.name, name)));

	return tag;
}

async function insertTag(
	name: string,
	userId: string,
): Promise<TaxonomyMutationResult> {
	try {
		await db.insert(tags).values({ userId, name });
	} catch (error) {
		if (isDuplicateNameError(error)) {
			return { status: "conflict" };
		}
		throw error;
	}

	return { status: "ok" };
}

async function updateTagName(
	tagId: number,
	name: string,
): Promise<TaxonomyMutationResult> {
	try {
		await db.update(tags).set({ name }).where(eq(tags.id, tagId));
	} catch (error) {
		if (isDuplicateNameError(error)) {
			return { status: "conflict" };
		}
		throw error;
	}

	return { status: "ok" };
}

async function upsertTagNames(
	tagNames: string[],
	userId: string,
): Promise<number[]> {
	if (tagNames.length === 0) {
		return [];
	}

	await db
		.insert(tags)
		.values(tagNames.map((name) => ({ userId, name })))
		.onConflictDoNothing();

	const rows = await db
		.select({ id: tags.id })
		.from(tags)
		.where(and(eq(tags.userId, userId), inArray(tags.name, tagNames)));

	return rows.map((row) => row.id);
}
