import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import {
	mediaItemInstances,
	mediaItemStatusEnum,
	mediaItems,
	mediaTypeEnum,
	series,
} from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	getMediaItemDetailsForUser,
	removeFromLibrary as removeFromLibraryForUser,
	saveInstanceForUser,
	updateMediaItemCreator as updateMediaItemCreatorForUser,
	updateMediaItemMetadata as updateMediaItemMetadataForUser,
	updateMediaItemSeries as updateMediaItemSeriesForUser,
	updateMediaItemStatusForUser,
} from "#/features/screens/mediaItemDetails/mediaItemDetails.server";
import { MediaItemStatus, NextItemStatus, PurchaseStatus } from "#/lib/enums";
import { transitionReleasedItems } from "#/lib/queries/itemQuery.server";
import {
	getNextItemInSeries,
	syncSeriesStatus,
} from "#/lib/queries/seriesQuery.server";

type InstanceDateRow = { startedAt: string | null; completedAt: string | null };

/** Derives a media item's status from the dates across all of its instances. */
export function inferStatusFromInstances(instances: InstanceDateRow[]) {
	if (instances.some((i) => i.startedAt && !i.completedAt)) {
		return MediaItemStatus.IN_PROGRESS;
	}
	if (instances.some((i) => i.completedAt)) {
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
		return getMediaItemDetailsForUser(id, user.id);
	});

export type MediaItemDetails = Awaited<ReturnType<typeof getMediaItemDetails>>;

export const updateMediaItemStatus = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			status: z.enum(mediaItemStatusEnum.enumValues),
		}),
	)
	.handler(async ({ data: { mediaItemId, status } }) => {
		const user = await getLoggedInUser();
		return updateMediaItemStatusForUser(mediaItemId, status, user.id);
	});

export type SeriesCompletionConfirmation = NonNullable<
	Awaited<ReturnType<typeof updateMediaItemStatus>>
>;

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
			progressPercent: z
				.string()
				.refine((value) => {
					const parsed = Number(value);
					return !Number.isNaN(parsed) && parsed >= 0 && parsed <= 100;
				})
				.optional(),
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
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return saveInstanceForUser(data, user.id);
	});

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
			.set({ status: inferStatusFromInstances(remainingInstances) })
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
