import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import {
	type FilterAndSortOptions,
	type ItemSortField,
	type SeriesSortField,
	type SortDirection,
	type UserSettings,
	userSettings,
} from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import type {
	BookConsumptionMethod,
	GameControlMethod,
	GamePlatform,
	MediaItemType,
	MovieConsumptionMethod,
	TvShowConsumptionMethod,
} from "#/lib/enums";

export const getUserSettings = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		const rows = await db
			.select()
			.from(userSettings)
			.where(eq(userSettings.userId, user.id))
			.limit(1);
		return rows[0] ?? null;
	},
);

const updateUserSettingsInput = z.object({
	defaultLibrarySortBy: z.string().nullish(),
	defaultLibrarySortDirection: z.string().nullish(),
	defaultSeriesSortBy: z.string().nullish(),
	defaultSeriesSortDirection: z.string().nullish(),
	defaultBookConsumptionMethod: z.string().nullish(),
	defaultMovieConsumptionMethod: z.string().nullish(),
	defaultTvShowConsumptionMethod: z.string().nullish(),
	defaultGamePlatform: z.string().nullish(),
	defaultGameControlMethod: z.string().nullish(),
	defaultInsightsItemTypes: z.array(z.string()).nullish(),
});

function toNullable<T>(value: T | null | undefined): T | null {
	return value ?? null;
}

export const updateUserSettings = createServerFn({ method: "POST" })
	.inputValidator(updateUserSettingsInput)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		const values = {
			userId: user.id,
			defaultLibrarySortBy: toNullable(
				data.defaultLibrarySortBy,
			) as ItemSortField | null,
			defaultLibrarySortDirection: toNullable(
				data.defaultLibrarySortDirection,
			) as SortDirection | null,
			defaultSeriesSortBy: toNullable(
				data.defaultSeriesSortBy,
			) as SeriesSortField | null,
			defaultSeriesSortDirection: toNullable(
				data.defaultSeriesSortDirection,
			) as SortDirection | null,
			defaultBookConsumptionMethod: toNullable(
				data.defaultBookConsumptionMethod,
			) as BookConsumptionMethod | null,
			defaultMovieConsumptionMethod: toNullable(
				data.defaultMovieConsumptionMethod,
			) as MovieConsumptionMethod | null,
			defaultTvShowConsumptionMethod: toNullable(
				data.defaultTvShowConsumptionMethod,
			) as TvShowConsumptionMethod | null,
			defaultGamePlatform: toNullable(
				data.defaultGamePlatform,
			) as GamePlatform | null,
			defaultGameControlMethod: toNullable(
				data.defaultGameControlMethod,
			) as GameControlMethod | null,
			defaultInsightsItemTypes: toNullable(data.defaultInsightsItemTypes) as
				| MediaItemType[]
				| null,
		};
		await db
			.insert(userSettings)
			.values(values)
			.onConflictDoUpdate({
				target: userSettings.userId,
				set: {
					defaultLibrarySortBy: values.defaultLibrarySortBy,
					defaultLibrarySortDirection: values.defaultLibrarySortDirection,
					defaultSeriesSortBy: values.defaultSeriesSortBy,
					defaultSeriesSortDirection: values.defaultSeriesSortDirection,
					defaultBookConsumptionMethod: values.defaultBookConsumptionMethod,
					defaultMovieConsumptionMethod: values.defaultMovieConsumptionMethod,
					defaultTvShowConsumptionMethod: values.defaultTvShowConsumptionMethod,
					defaultGamePlatform: values.defaultGamePlatform,
					defaultGameControlMethod: values.defaultGameControlMethod,
					defaultInsightsItemTypes: values.defaultInsightsItemTypes,
				},
			});
	});

// ---- Private helpers

const DEFAULT_LIBRARY_SORT_BY: ItemSortField = "series";
const DEFAULT_SERIES_SORT_BY: SeriesSortField = "name";
const DEFAULT_SORT_DIRECTION: SortDirection = "asc";

export function applyLibrarySortDefaults(
	search: FilterAndSortOptions,
	settings: UserSettings | null,
): FilterAndSortOptions {
	return {
		sortBy: settings?.defaultLibrarySortBy ?? DEFAULT_LIBRARY_SORT_BY,
		sortDirection:
			settings?.defaultLibrarySortDirection ?? DEFAULT_SORT_DIRECTION,
		...search,
	};
}

export function applySeriesSortDefaults(
	search: FilterAndSortOptions,
	settings: UserSettings | null,
): FilterAndSortOptions {
	return {
		sortBy: settings?.defaultSeriesSortBy ?? DEFAULT_SERIES_SORT_BY,
		sortDirection:
			settings?.defaultSeriesSortDirection ?? DEFAULT_SORT_DIRECTION,
		...search,
	};
}

export function resolveInsightsItemTypes(
	search: { itemTypes?: MediaItemType[] },
	settings: UserSettings | null,
): MediaItemType[] {
	return search.itemTypes ?? settings?.defaultInsightsItemTypes ?? [];
}
