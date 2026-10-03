import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import {
	type FilterAndSortOptions,
	type ViewSubject,
	views,
} from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	findOwnedView,
	handleGetViewOrderItems,
	handleGetViewStats,
	handleReorderViewItems,
} from "#/features/screens/customView/view.server";
import { filterAndSortOptionsSchema } from "#/lib/filterAndSort";
import { runItemQuery } from "#/lib/queries/itemQuery.server";
import { runSeriesQuery } from "#/lib/queries/seriesQuery.server";
import { MAX_QUERY_LIMIT } from "#/lib/queries/types";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createViewSchema = z.object({
	name: z.string().min(1),
	subject: z.enum(["items", "series"]),
	filters: filterAndSortOptionsSchema,
	displayOrder: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const getViews = createServerFn({ method: "GET" }).handler(async () => {
	const user = await getLoggedInUser();
	return db
		.select()
		.from(views)
		.where(eq(views.userId, user.id))
		.orderBy(asc(views.displayOrder), asc(views.id));
});

export type View = Awaited<ReturnType<typeof getViews>>[number];

export type ViewFilterOverrides = Pick<
	FilterAndSortOptions,
	"titleQuery" | "statuses" | "purchaseStatuses"
>;

/**
 * Merges a view's saved filters with transient overrides from the URL (title
 * search, or a stats-bar click narrowing to one status). `statuses` and
 * `purchaseStatuses` only replace the saved value when explicitly provided,
 * unlike `titleQuery`, which the view never has one of to begin with — this
 * never writes back to the view's own saved filters.
 */
export function applyViewFilterOverrides(
	baseFilters: FilterAndSortOptions | null,
	overrides: ViewFilterOverrides,
): FilterAndSortOptions {
	return {
		...(baseFilters ?? {}),
		titleQuery: overrides.titleQuery,
		...(overrides.statuses !== undefined
			? { statuses: overrides.statuses }
			: {}),
		...(overrides.purchaseStatuses !== undefined
			? { purchaseStatuses: overrides.purchaseStatuses }
			: {}),
	} as FilterAndSortOptions;
}

export const getViewResults = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			viewId: z.number(),
			titleQuery: z.string().optional(),
			statuses: filterAndSortOptionsSchema.shape.statuses,
			purchaseStatuses: filterAndSortOptionsSchema.shape.purchaseStatuses,
			offset: z.number().default(0),
			limit: z.number().int().min(1).max(MAX_QUERY_LIMIT).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { viewId, titleQuery, statuses, purchaseStatuses, offset, limit } =
			data;
		const user = await getLoggedInUser();
		const view = await findOwnedView(viewId, user.id);

		const filters = applyViewFilterOverrides(view.filters, {
			titleQuery,
			statuses,
			purchaseStatuses,
		});

		if (view.subject === "items") {
			return {
				view,
				results: await runItemQuery(filters, user.id, offset, view.id, limit),
			};
		}

		return {
			view,
			results: await runSeriesQuery(filters, user.id, offset, limit),
		};
	});

export const getViewOrderItems = createServerFn({ method: "GET" })
	.inputValidator(z.object({ viewId: z.number() }))
	.handler(async ({ data: { viewId } }) => {
		const user = await getLoggedInUser();
		return handleGetViewOrderItems(viewId, user.id);
	});

export const getViewStats = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			viewId: z.number(),
			titleQuery: z.string().optional(),
			statuses: filterAndSortOptionsSchema.shape.statuses,
			purchaseStatuses: filterAndSortOptionsSchema.shape.purchaseStatuses,
		}),
	)
	.handler(
		async ({ data: { viewId, titleQuery, statuses, purchaseStatuses } }) => {
			const user = await getLoggedInUser();
			return handleGetViewStats(
				viewId,
				user.id,
				titleQuery,
				statuses,
				purchaseStatuses,
			);
		},
	);

export type ViewResults = Awaited<ReturnType<typeof getViewResults>>;
export type ItemViewResult = Extract<
	ViewResults,
	{ view: { subject: "items" } }
>["results"][number];
export type SeriesViewResult = Extract<
	ViewResults,
	{ view: { subject: "series" } }
>["results"][number];

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export const createView = createServerFn({ method: "POST" })
	.inputValidator(createViewSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const [created] = await db
			.insert(views)
			.values({
				userId: user.id,
				name: data.name,
				subject: data.subject as ViewSubject,
				filters: data.filters as FilterAndSortOptions,
				displayOrder: data.displayOrder ?? 999,
			})
			.returning();
		return created;
	});

export const updateView = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.number(),
			name: z.string().min(1),
			filters: filterAndSortOptionsSchema,
			displayOrder: z.number().int().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await db
			.update(views)
			.set({
				name: data.name,
				filters: data.filters as FilterAndSortOptions,
				...(data.displayOrder !== undefined
					? { displayOrder: data.displayOrder }
					: {}),
			})
			.where(and(eq(views.id, data.id), eq(views.userId, user.id)));
	});

export const deleteView = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const user = await getLoggedInUser();
		await db
			.delete(views)
			.where(and(eq(views.id, id), eq(views.userId, user.id)));
	});

export const reorderViewItems = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			viewId: z.number(),
			orderedMediaItemIds: z.array(z.number()),
		}),
	)
	.handler(async ({ data: { viewId, orderedMediaItemIds } }) => {
		const user = await getLoggedInUser();
		await handleReorderViewItems(viewId, orderedMediaItemIds, user.id);
	});
