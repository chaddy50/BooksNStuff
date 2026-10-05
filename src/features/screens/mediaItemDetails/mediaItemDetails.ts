import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import {
	type ConsumptionInfo,
	creators,
	genres,
	mediaItemInstances,
	mediaItemStatusEnum,
	mediaItems,
	mediaItemTags,
	mediaTypeEnum,
	series,
	tags,
} from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	removeFromLibrary as removeFromLibraryForUser,
	updateMediaItemCreator as updateMediaItemCreatorForUser,
	updateMediaItemMetadata as updateMediaItemMetadataForUser,
	updateMediaItemSeries as updateMediaItemSeriesForUser,
} from "#/features/screens/mediaItemDetails/mediaItemDetails.server";
import { getRelatedMediaItems } from "#/features/screens/mediaItemDetails/relatedItems.server";
import { MediaItemStatus, NextItemStatus, PurchaseStatus } from "#/lib/enums";
import { transitionReleasedItems } from "#/lib/queries/itemQuery.server";
import {
	getNextItemInSeries,
	syncSeriesStatus,
} from "#/lib/queries/seriesQuery.server";

export function inferStatusAfterInstanceEdit(
	startedAt?: string | null,
	completedAt?: string | null,
) {
	if (completedAt) return MediaItemStatus.COMPLETED;
	if (startedAt) return MediaItemStatus.IN_PROGRESS;
	return null;
}

type InstanceDateRow = { startedAt: string | null; completedAt: string | null };

export function inferStatusAfterInstanceDelete(
	remainingInstances: InstanceDateRow[],
) {
	if (remainingInstances.some((i) => i.startedAt && !i.completedAt)) {
		return MediaItemStatus.IN_PROGRESS;
	}
	if (remainingInstances.some((i) => i.completedAt)) {
		return MediaItemStatus.COMPLETED;
	}
	return MediaItemStatus.BACKLOG;
}

export const setMediaItemExpectedReleaseDate = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			expectedReleaseDate: z.string().nullable(),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await db
			.update(mediaItems)
			.set({ expectedReleaseDate: data.expectedReleaseDate })
			.where(
				and(
					eq(mediaItems.id, data.mediaItemId),
					eq(mediaItems.userId, user.id),
				),
			);
	});

export const getMediaItemDetails = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const user = await getLoggedInUser();
		await transitionReleasedItems(user.id);
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
			.where(and(eq(mediaItems.id, id), eq(mediaItems.userId, user.id)));

		if (!row) throw new Error(`Entry ${id} not found`);

		const instances = await db
			.select({
				id: mediaItemInstances.id,
				rating: mediaItemInstances.rating,
				fictionRating: mediaItemInstances.fictionRating,
				seasonReviews: mediaItemInstances.seasonReviews,
				consumptionInfo: mediaItemInstances.consumptionInfo,
				reviewText: mediaItemInstances.reviewText,
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
			relatedItems: await getRelatedMediaItems(id, user.id),
		};
	});

export type MediaItemDetails = Awaited<ReturnType<typeof getMediaItemDetails>>;

async function requireOwnedMediaItem(mediaItemId: number, userId: string) {
	const [item] = await db
		.select({ seriesId: mediaItems.seriesId })
		.from(mediaItems)
		.where(and(eq(mediaItems.id, mediaItemId), eq(mediaItems.userId, userId)));
	if (!item) throw new Error("Media item not found");
	return item;
}

async function findUnfinishedInstance(mediaItemId: number) {
	const [instance] = await db
		.select({ id: mediaItemInstances.id })
		.from(mediaItemInstances)
		.where(
			and(
				eq(mediaItemInstances.mediaItemId, mediaItemId),
				isNotNull(mediaItemInstances.startedAt),
				isNull(mediaItemInstances.completedAt),
			),
		)
		.orderBy(desc(mediaItemInstances.id))
		.limit(1);
	return instance ?? null;
}

export const updateMediaItemStatus = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			status: z.enum(mediaItemStatusEnum.enumValues),
		}),
	)
	.handler(async ({ data: { mediaItemId, status } }) => {
		const user = await getLoggedInUser();
		const item = await requireOwnedMediaItem(mediaItemId, user.id);

		const today = new Date().toISOString().slice(0, 10);

		if (status === MediaItemStatus.IN_PROGRESS) {
			const existingUnfinishedInstance =
				await findUnfinishedInstance(mediaItemId);
			if (!existingUnfinishedInstance) {
				await db.insert(mediaItemInstances).values({
					mediaItemId,
					startedAt: today,
				});
			}
		} else if (status === MediaItemStatus.COMPLETED) {
			const unfinishedInstance = await findUnfinishedInstance(mediaItemId);
			if (unfinishedInstance) {
				await db
					.update(mediaItemInstances)
					.set({ completedAt: today })
					.where(eq(mediaItemInstances.id, unfinishedInstance.id));
			}
		}

		await db
			.update(mediaItems)
			.set({ status })
			.where(
				and(eq(mediaItems.id, mediaItemId), eq(mediaItems.userId, user.id)),
			);

		if (item.seriesId) {
			await syncSeriesStatus(item.seriesId, user.id);
		}
	});

const fictionRatingSchema = z.object({
	setting: z.object({ rating: z.number(), comment: z.string().optional() }),
	character: z.object({ rating: z.number(), comment: z.string().optional() }),
	plot: z.object({ rating: z.number(), comment: z.string().optional() }),
	enjoyment: z.object({ rating: z.number(), comment: z.string().optional() }),
	depth: z.object({ rating: z.number(), comment: z.string().optional() }),
});

export const saveInstance = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			instanceId: z.number().optional(),
			rating: z.string().optional(),
			fictionRating: fictionRatingSchema.optional(),
			reviewText: z.string().optional(),
			startedAt: z.string().optional(),
			completedAt: z.string().optional(),
			seasonReviews: z
				.array(
					z.object({
						season: z.number(),
						startedAt: z.string(),
						completedAt: z.string(),
						rating: z.number(),
						reviewText: z.string(),
						fictionRating: fictionRatingSchema.optional(),
					}),
				)
				.optional(),
			consumptionInfo: z
				.object({ method: z.string(), controlMethod: z.string().optional() })
				.optional(),
		}),
	)
	.handler(
		async ({
			data: {
				mediaItemId,
				instanceId,
				rating,
				fictionRating,
				reviewText,
				startedAt,
				completedAt,
				seasonReviews,
				consumptionInfo,
			},
		}) => {
			const user = await getLoggedInUser();
			const item = await requireOwnedMediaItem(mediaItemId, user.id);

			const values = {
				rating: rating ?? null,
				fictionRating: fictionRating ?? null,
				seasonReviews: seasonReviews ?? null,
				consumptionInfo: (consumptionInfo ?? null) as ConsumptionInfo | null,
				reviewText: reviewText || null,
				startedAt: startedAt || null,
				completedAt: completedAt || null,
			};
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
				await db
					.insert(mediaItemInstances)
					.values({ mediaItemId: mediaItemId, ...values });
			}

			const newStatus = inferStatusAfterInstanceEdit(startedAt, completedAt);
			if (newStatus) {
				await db
					.update(mediaItems)
					.set({ status: newStatus })
					.where(
						and(eq(mediaItems.id, mediaItemId), eq(mediaItems.userId, user.id)),
					);
			}

			if (item.seriesId) {
				await syncSeriesStatus(item.seriesId, user.id);
			}
		},
	);

export const deleteInstance = createServerFn({ method: "POST" })
	.inputValidator(z.object({ instanceId: z.number() }))
	.handler(async ({ data: { instanceId } }) => {
		const user = await getLoggedInUser();
		const [instanceBeingDeleted] = await db
			.select({
				mediaItemId: mediaItemInstances.mediaItemId,
			})
			.from(mediaItemInstances)
			.innerJoin(mediaItems, eq(mediaItems.id, mediaItemInstances.mediaItemId))
			.where(
				and(
					eq(mediaItemInstances.id, instanceId),
					eq(mediaItems.userId, user.id),
				),
			);

		if (!instanceBeingDeleted) return;

		await db
			.delete(mediaItemInstances)
			.where(eq(mediaItemInstances.id, instanceId));

		const remainingInstances = await db
			.select({
				startedAt: mediaItemInstances.startedAt,
				completedAt: mediaItemInstances.completedAt,
			})
			.from(mediaItemInstances)
			.where(
				eq(mediaItemInstances.mediaItemId, instanceBeingDeleted.mediaItemId),
			);

		await db
			.update(mediaItems)
			.set({ status: inferStatusAfterInstanceDelete(remainingInstances) })
			.where(
				and(
					eq(mediaItems.id, instanceBeingDeleted.mediaItemId),
					eq(mediaItems.userId, user.id),
				),
			);

		const [item] = await db
			.select({ seriesId: mediaItems.seriesId })
			.from(mediaItems)
			.where(
				and(
					eq(mediaItems.id, instanceBeingDeleted.mediaItemId),
					eq(mediaItems.userId, user.id),
				),
			);

		if (item?.seriesId) {
			await syncSeriesStatus(item.seriesId, user.id);
		}
	});

export const updateMediaItemMetadata = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			title: z.string(),
			description: z.string().optional(),
			coverImageUrl: z.string().optional(),
			releaseDate: z.string().optional(),
			metadata: z.any(),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return updateMediaItemMetadataForUser(data, user.id);
	});

export const updateMediaItemSeries = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			type: z.enum(mediaTypeEnum.enumValues),
			seriesId: z.number().nullable(),
			newSeriesName: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return updateMediaItemSeriesForUser(data, user.id);
	});

export const updateMediaItemCreator = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			type: z.enum(mediaTypeEnum.enumValues),
			creatorId: z.number().nullable(),
			newCreatorName: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return updateMediaItemCreatorForUser(data, user.id);
	});

export const setPurchaseStatus = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			purchaseStatus: z.enum([
				PurchaseStatus.NOT_PURCHASED,
				PurchaseStatus.WANT_TO_BUY,
				PurchaseStatus.PURCHASED,
			]),
		}),
	)
	.handler(async ({ data: { mediaItemId, purchaseStatus } }) => {
		const user = await getLoggedInUser();

		const [item] = await db
			.select({ seriesId: mediaItems.seriesId })
			.from(mediaItems)
			.where(
				and(eq(mediaItems.id, mediaItemId), eq(mediaItems.userId, user.id)),
			);

		await db
			.update(mediaItems)
			.set({ purchaseStatus })
			.where(
				and(eq(mediaItems.id, mediaItemId), eq(mediaItems.userId, user.id)),
			);

		if (item?.seriesId) {
			const nextItem = await getNextItemInSeries(item.seriesId, user.id);
			if (nextItem?.id === mediaItemId) {
				await db
					.update(series)
					.set({
						nextItemStatus:
							purchaseStatus === PurchaseStatus.PURCHASED
								? NextItemStatus.PURCHASED
								: NextItemStatus.AVAILABLE,
					})
					.where(and(eq(series.id, item.seriesId), eq(series.userId, user.id)));
			}
		}
	});

export const removeFromLibrary = createServerFn({ method: "POST" })
	.inputValidator(z.object({ mediaItemId: z.number() }))
	.handler(async ({ data: { mediaItemId } }) => {
		const user = await getLoggedInUser();
		return removeFromLibraryForUser(mediaItemId, user.id);
	});
