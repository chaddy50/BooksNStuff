import { sql } from "drizzle-orm";

import { db } from "#/database/index";
import { MediaItemType } from "#/lib/enums";
import type { ReportDataPoint } from "../types";
import { buildMonthRange } from "../utils.server";

/**
 * Returns the SQL expression that computes the progress metric for a given
 * media type. Reads from the `mi` (media_items) alias.
 *
 *   book       → pages read (pageCount)
 *   tv_show    → episodes watched (numberOfEpisodes)
 *   movie      → hours watched (runtime / 60)
 *   podcast    → hours listened (totalDuration / 60)
 *   video_game → hours played (timeToBeatNormally, fallback to timeToBeatHastily)
 */
export function getProgressByMonthSqlExpression(
	mediaType: MediaItemType,
): ReturnType<typeof sql> {
	switch (mediaType) {
		case MediaItemType.BOOK:
			return sql`(mi.metadata->>'pageCount')::float`;
		case MediaItemType.TV_SHOW:
			return sql`(mi.metadata->>'numberOfEpisodes')::float`;
		case MediaItemType.MOVIE:
			return sql`((mi.metadata->>'runtime')::float / 60.0)`;
		case MediaItemType.PODCAST:
			return sql`((mi.metadata->>'totalDuration')::float / 60.0)`;
		case MediaItemType.VIDEO_GAME:
			return sql`COALESCE((mi.metadata->>'timeToBeatNormally')::float, (mi.metadata->>'timeToBeatHastily')::float, 0)`;
		default:
			return sql`0`;
	}
}

/**
 * Progress by month — metric adapts to the single media type.
 * See getProgressByMonthSqlExpression for the per-type logic.
 *
 * Each progress update contributes its own slice of the full metric,
 * scaled by the percentage it moved and attributed to the month it was
 * recorded — not the month the item was eventually completed.
 */
export async function fetchProgressByMonth(
	userId: string,
	mediaType: MediaItemType,
	startDate: string,
	endDate: string,
): Promise<ReportDataPoint[]> {
	const progressByMonthExpression = getProgressByMonthSqlExpression(mediaType);

	const rows = await db.execute<{ month: string; value: number }>(sql`
		SELECT month, COALESCE(GREATEST(ROUND(SUM(contribution)), 0), 0) AS value
		FROM (
			SELECT
				to_char(upd.recorded_at, 'YYYY-MM') AS month,
				${progressByMonthExpression} * (upd.progress_percent_delta::float / 100.0) AS contribution
			FROM media_item_progress_updates upd
			JOIN media_item_instances inst ON upd.media_item_instance_id = inst.id
			JOIN media_items mi ON inst.media_item_id = mi.id
			WHERE
				mi.user_id = ${userId}
				AND mi.type = ${mediaType}
				AND upd.recorded_at >= ${startDate}
				AND upd.recorded_at <= ${endDate}
		) sub
		GROUP BY month
		ORDER BY month
	`);

	return buildMonthRange(rows.rows, startDate, endDate);
}
