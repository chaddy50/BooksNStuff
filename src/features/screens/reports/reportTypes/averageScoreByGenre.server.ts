import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "#/database/index";
import { genres, mediaItemInstances, mediaItems } from "#/database/schema";
import type { MediaItemType } from "#/lib/enums";
import type { GenreDataPoint } from "../types";

export async function fetchAverageScoreByGenre(
	userId: string,
	startDate: string,
	endDate: string,
	mediaTypes?: MediaItemType[] | null,
): Promise<GenreDataPoint[]> {
	const hasTypeFilter = mediaTypes && mediaTypes.length > 0;

	const rows = await db
		.select({
			genre: genres.name,
			value: sql<number>`ROUND(AVG(${mediaItemInstances.rating}::float)::numeric, 1)`,
		})
		.from(mediaItemInstances)
		.innerJoin(mediaItems, eq(mediaItemInstances.mediaItemId, mediaItems.id))
		.innerJoin(genres, eq(mediaItems.genreId, genres.id))
		.where(
			and(
				eq(mediaItems.userId, userId),
				// A cleared rating is stored as 0 (not NULL) by the instance editor,
				// so it must be excluded here too or it drags the average toward zero.
				sql`${mediaItemInstances.rating} > 0`,
				isNotNull(mediaItemInstances.completedAt),
				sql`${mediaItemInstances.completedAt} >= ${startDate}`,
				sql`${mediaItemInstances.completedAt} <= ${endDate}`,
				hasTypeFilter ? inArray(mediaItems.type, mediaTypes) : undefined,
			),
		)
		.groupBy(genres.name)
		.orderBy(sql`AVG(${mediaItemInstances.rating}::float) DESC`);

	return rows.map((row) => ({ genre: row.genre, value: Number(row.value) }));
}
