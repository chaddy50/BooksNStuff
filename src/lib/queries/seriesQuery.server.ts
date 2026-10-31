import {
	and,
	asc,
	desc,
	eq,
	exists,
	ilike,
	inArray,
	or,
	sql,
} from "drizzle-orm";

import { db } from "#/database/index";
import {
	type FilterAndSortOptions,
	mediaItems,
	type SeriesSortField,
	series,
} from "#/database/schema";
import {
	MediaItemStatus,
	type MediaItemType,
	NextItemStatus,
} from "#/lib/enums";
import {
	fetchLatestRatingsByMediaItemId,
	parseRatingColumn,
} from "#/lib/queries/ratingsQuery.server";
import { inferSeriesStatus } from "#/lib/queries/seriesStatus";
import { MAX_QUERY_LIMIT } from "#/lib/queries/types";
import { findFirstMatchAfterIndex, findLastIndexWhere } from "#/lib/utils";

// ---------------------------------------------------------------------------
// runSeriesQuery
// ---------------------------------------------------------------------------

export type SeriesQueryItem = {
	id: number;
	name: string;
	type: MediaItemType;
	status: MediaItemStatus;
	rating: number;
	isComplete: boolean;
	nextItemStatus: NextItemStatus | null;
	itemCount: number;
};

const PAGE_SIZE = 48;

export async function runSeriesQuery(
	filters: FilterAndSortOptions,
	userId: string,
	offset: number = 0,
	limit: number = PAGE_SIZE,
): Promise<{ items: SeriesQueryItem[]; hasMore: boolean }> {
	const pageLimit = Math.min(limit, MAX_QUERY_LIMIT);
	const conditions = [
		eq(series.userId, userId),
		filters.mediaTypes?.length
			? inArray(series.type, filters.mediaTypes)
			: undefined,
		filters.statuses?.length
			? inArray(series.status, filters.statuses)
			: undefined,
		filters.isSeriesComplete !== undefined
			? eq(series.isComplete, filters.isSeriesComplete)
			: undefined,
		filters.titleQuery
			? or(
					ilike(series.name, `%${filters.titleQuery}%`),
					exists(
						db
							.select({ one: sql`1` })
							.from(mediaItems)
							.where(
								and(
									eq(mediaItems.seriesId, series.id),
									eq(mediaItems.userId, userId),
									or(
										ilike(mediaItems.title, `%${filters.titleQuery}%`),
										sql`${mediaItems.metadata}->>'author' ILIKE ${`%${filters.titleQuery}%`}`,
										sql`${mediaItems.metadata}->>'director' ILIKE ${`%${filters.titleQuery}%`}`,
										sql`${mediaItems.metadata}->>'creator' ILIKE ${`%${filters.titleQuery}%`}`,
										sql`${mediaItems.metadata}->>'developer' ILIKE ${`%${filters.titleQuery}%`}`,
									),
								),
							),
					),
				)
			: undefined,
	].filter((c) => c !== undefined);

	const sortBy = (filters.sortBy as SeriesSortField | undefined) ?? "name";
	const sortDirection = filters.sortDirection ?? "asc";
	const dir = sortDirection === "asc" ? asc : desc;

	// Correlated subquery for item count — avoids a separate aggregation query
	// and enables SQL-level sorting by itemCount.
	// NOTE: ${series.id} cannot be used directly here — Drizzle strips the table
	// qualifier in query-builder context, so it becomes bare "id" which PostgreSQL
	// resolves to media_items.id inside the subquery instead of series.id.
	// sql.raw forces the fully-qualified reference needed for correct correlation.
	const itemCountSql = sql<number>`(
		SELECT COUNT(*)::int
		FROM ${mediaItems}
		WHERE ${mediaItems.seriesId} = ${sql.raw('"series"."id"')}
			AND ${mediaItems.userId} = ${userId}
	)`;

	const dbOrderClauses =
		sortBy === "updatedAt"
			? [dir(series.updatedAt)]
			: sortBy === "status"
				? [dir(series.statusSortOrder), asc(series.sortName)]
				: sortBy === "nextItemStatus"
					? [
							sql`${series.nextItemStatusSortOrder} ${sql.raw(sortDirection === "asc" ? "ASC" : "DESC")} NULLS LAST`,
							asc(series.sortName),
						]
					: sortBy === "rating"
						? [
								sql`${series.rating} ${sql.raw(sortDirection === "asc" ? "ASC" : "DESC")} NULLS LAST`,
								asc(series.sortName),
							]
						: sortBy === "itemCount"
							? [
									sql`${itemCountSql} ${sql.raw(sortDirection === "asc" ? "ASC" : "DESC")} NULLS LAST`,
									asc(series.sortName),
								]
							: [dir(series.sortName)];

	const rawRows = await db
		.select({
			id: series.id,
			name: series.name,
			type: series.type,
			status: series.status,
			rating: series.rating,
			isComplete: series.isComplete,
			nextItemStatus: series.nextItemStatus,
			itemCount: itemCountSql,
		})
		.from(series)
		.where(and(...conditions))
		.orderBy(...dbOrderClauses)
		.limit(pageLimit + 1)
		.offset(offset);

	const hasMore = rawRows.length > pageLimit;
	const pageRows = rawRows.slice(0, pageLimit);

	const items = pageRows.map((s) => ({
		...s,
		rating: parseRatingColumn(s.rating),
	}));

	return { items, hasMore };
}

// ---------------------------------------------------------------------------
// findNextSeriesItem / getNextItemInSeries
// ---------------------------------------------------------------------------

/**
 * Pure function: given an already-sorted list of series items, return the next
 * item the user should pick up. "Next" means the first BACKLOG item after the
 * last item the user has engaged with (any status other than BACKLOG).
 *
 * If no item has been engaged with yet (all are BACKLOG), returns the first
 * item in the list — the logical starting point for a new series.
 *
 * Returns null when the list is empty or no BACKLOG items remain after the
 * last engaged item.
 */
export function findNextSeriesItem(
	items: Array<{ id: number; status: MediaItemStatus; purchaseStatus: string }>,
): { id: number; purchaseStatus: string } | null {
	if (items.length === 0) {
		return null;
	}

	const lastEngagedIndex = findLastIndexWhere(
		items,
		(item) => item.status !== MediaItemStatus.BACKLOG,
	);

	if (lastEngagedIndex === -1) {
		// No item has been engaged with — return the first item as the starting point.
		return items[0] ?? null;
	}

	const nextItem = findFirstMatchAfterIndex(
		items,
		lastEngagedIndex,
		(item) => item.status === MediaItemStatus.BACKLOG,
	);

	return nextItem ?? null;
}

export async function getNextItemInSeries(
	seriesId: number,
	userId: string,
): Promise<{ id: number; purchaseStatus: string } | null> {
	const items = await db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			purchaseStatus: mediaItems.purchaseStatus,
		})
		.from(mediaItems)
		.where(
			and(eq(mediaItems.seriesId, seriesId), eq(mediaItems.userId, userId)),
		)
		.orderBy(
			sql`(NULLIF(${mediaItems.metadata}->>'seriesBookNumber', ''))::float ASC NULLS LAST`,
			asc(mediaItems.releaseDate),
			asc(mediaItems.sortTitle),
		);

	return findNextSeriesItem(items);
}

// ---------------------------------------------------------------------------
// syncSeriesStatus
// ---------------------------------------------------------------------------

/** Average rating across an about-to-complete series' items, or null if none are rated. */
async function computeCompletedSeriesRating(
	itemIds: number[],
): Promise<string | null> {
	const latestRatings = await fetchLatestRatingsByMediaItemId(itemIds);

	// A cleared rating is stored as 0 (not NULL) by the instance editor, so it
	// must be excluded here too or it drags the average toward zero.
	const ratings = Array.from(latestRatings.values())
		.map((r) => r.rating)
		.filter((r) => r > 0);
	if (ratings.length === 0) return null;

	const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
	return average.toFixed(1);
}

/** What the series' nextItemStatus should become now that its status is newStatus. */
async function resolveNextItemStatus(
	seriesId: number,
	userId: string,
	newStatus: MediaItemStatus,
): Promise<NextItemStatus | null> {
	if (newStatus === MediaItemStatus.COMPLETED) return null;
	if (newStatus === MediaItemStatus.WAITING_FOR_NEXT_RELEASE) {
		return NextItemStatus.WAITING_FOR_RELEASE;
	}

	// Leaving WAITING_FOR_NEXT_RELEASE for any other status clears a stale
	// "waiting for release" marker, but leaves PURCHASED/AVAILABLE markers
	// alone since those are set independently via updateNextItemStatus.
	const [current] = await db
		.select({ nextItemStatus: series.nextItemStatus })
		.from(series)
		.where(and(eq(series.id, seriesId), eq(series.userId, userId)));
	return current?.nextItemStatus === NextItemStatus.WAITING_FOR_RELEASE
		? null
		: (current?.nextItemStatus ?? null);
}

export async function syncSeriesStatus(
	seriesId: number,
	userId: string,
	options: { allowCompleting?: boolean } = {},
) {
	const allowCompleting = options.allowCompleting ?? true;

	const [seriesRow] = await db
		.select({ status: series.status, isComplete: series.isComplete })
		.from(series)
		.where(and(eq(series.id, seriesId), eq(series.userId, userId)));
	if (!seriesRow) return;

	const items = await db
		.select({ id: mediaItems.id, status: mediaItems.status })
		.from(mediaItems)
		.where(
			and(eq(mediaItems.seriesId, seriesId), eq(mediaItems.userId, userId)),
		);

	if (items.length === 0) return;

	const statuses = items.map((i) => i.status);
	const inferredStatus = inferSeriesStatus(statuses, seriesRow.status);

	if (inferredStatus === null) return;

	// A series the user chose to keep "waiting" shouldn't silently complete just
	// because an unrelated, already-finished item was touched again.
	const isStuckWaitingForRelease =
		inferredStatus === MediaItemStatus.COMPLETED &&
		seriesRow.status === MediaItemStatus.WAITING_FOR_NEXT_RELEASE &&
		!seriesRow.isComplete;
	const isBlockedFromCompleting =
		!allowCompleting &&
		inferredStatus === MediaItemStatus.COMPLETED &&
		seriesRow.status !== MediaItemStatus.COMPLETED;

	const newStatus =
		isStuckWaitingForRelease || isBlockedFromCompleting
			? seriesRow.status
			: inferredStatus;

	const newRating =
		newStatus === MediaItemStatus.COMPLETED
			? await computeCompletedSeriesRating(items.map((item) => item.id))
			: null;

	const seriesUpdates: Partial<typeof series.$inferInsert> = {
		status: newStatus,
		rating: newRating,
		nextItemStatus: await resolveNextItemStatus(seriesId, userId, newStatus),
	};

	await db
		.update(series)
		.set(seriesUpdates)
		.where(and(eq(series.id, seriesId), eq(series.userId, userId)));
}

export type SeriesCompletionConfirmation = {
	seriesId: number;
	seriesName: string;
};

/** Would syncing this series right now complete it while it's still "Ongoing"? */
async function checkSeriesCompletionConfirmation(
	seriesId: number,
	userId: string,
): Promise<SeriesCompletionConfirmation | null> {
	const [seriesRow] = await db
		.select({ name: series.name, isComplete: series.isComplete })
		.from(series)
		.where(and(eq(series.id, seriesId), eq(series.userId, userId)));
	if (!seriesRow || seriesRow.isComplete) return null;

	const items = await db
		.select({ status: mediaItems.status })
		.from(mediaItems)
		.where(
			and(eq(mediaItems.seriesId, seriesId), eq(mediaItems.userId, userId)),
		);

	const wouldComplete =
		inferSeriesStatus(items.map((i) => i.status)) === MediaItemStatus.COMPLETED;
	return wouldComplete ? { seriesId, seriesName: seriesRow.name } : null;
}

/**
 * Drop-in replacement for `syncSeriesStatus` at call sites where a human is
 * actively waiting on the result. When the item just transitioned into
 * COMPLETED and that would complete an "Ongoing" series, holds off syncing and
 * returns a confirmation payload instead; the series' status is left untouched
 * until the user resolves it (via `updateSeriesStatus` or
 * `confirmSeriesCompletion`).
 */
export async function syncSeriesStatusWithCompletionConfirmation(
	seriesId: number,
	userId: string,
	isItemNewlyCompleting: boolean,
): Promise<SeriesCompletionConfirmation | null> {
	if (isItemNewlyCompleting) {
		const confirmation = await checkSeriesCompletionConfirmation(
			seriesId,
			userId,
		);
		if (confirmation) return confirmation;
	}
	await syncSeriesStatus(seriesId, userId);
	return null;
}
