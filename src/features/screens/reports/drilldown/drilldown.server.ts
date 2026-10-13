import { sql } from "drizzle-orm";

import { db } from "#/database/index";
import type {
	MediaItemStatus,
	MediaItemType,
	PurchaseStatus,
} from "#/lib/enums";
import type { DrillDownItem } from "../types";

type DrillDownRow = {
	id: number;
	status: string;
	purchase_status: string;
	title: string;
	type: string;
	cover_image_url: string | null;
	rating: string | null;
	completed_at: string | null;
	expected_release_date: string | null;
	series_id: number | null;
	series_name: string | null;
};

function mapDrillDownRow(row: DrillDownRow): DrillDownItem {
	return {
		id: row.id,
		status: row.status as MediaItemStatus,
		purchaseStatus: row.purchase_status as PurchaseStatus,
		title: row.title,
		type: row.type as MediaItemType,
		coverImageUrl: row.cover_image_url,
		rating: row.rating ? Number(row.rating) : 0,
		completedAt: row.completed_at,
		expectedReleaseDate: row.expected_release_date,
		seriesId: row.series_id,
		seriesName: row.series_name,
	};
}

function buildTypeFilterSql(mediaTypes?: MediaItemType[] | null) {
	const filteredTypes = mediaTypes && mediaTypes.length > 0 ? mediaTypes : [];
	if (filteredTypes.length === 0) {
		return sql``;
	}

	return sql`AND mi.type::text = ANY(ARRAY[${sql.join(
		filteredTypes.map((t) => sql`${t}`),
		sql`, `,
	)}]::text[])`;
}

export async function fetchDrillDownItemsForMonth(
	userId: string,
	month: string, // "YYYY-MM"
	mediaTypes?: MediaItemType[] | null,
): Promise<DrillDownItem[]> {
	const typeFilterSql = buildTypeFilterSql(mediaTypes);

	const rows = await db.execute<DrillDownRow>(sql`
		SELECT * FROM (
			SELECT DISTINCT ON (mi.id)
				mi.id,
				mi.status,
				mi.purchase_status,
				mi.title,
				mi.type,
				mi.cover_image_url,
				inst.rating,
				inst.completed_at,
				mi.expected_release_date,
				mi.series_id,
				s.name AS series_name
			FROM media_item_instances inst
			JOIN media_items mi ON inst.media_item_id = mi.id
			LEFT JOIN series s ON mi.series_id = s.id
			WHERE
				mi.user_id = ${userId}
				AND inst.completed_at IS NOT NULL
				AND to_char(inst.completed_at, 'YYYY-MM') = ${month}
				${typeFilterSql}
			ORDER BY mi.id, inst.completed_at DESC
		) sub
		ORDER BY sub.completed_at DESC
	`);

	return rows.rows.map(mapDrillDownRow);
}

export async function fetchDrillDownItemsForGenre(
	userId: string,
	genre: string,
	startDate: string,
	endDate: string,
	mediaTypes?: MediaItemType[] | null,
): Promise<DrillDownItem[]> {
	const typeFilterSql = buildTypeFilterSql(mediaTypes);

	const rows = await db.execute<DrillDownRow>(sql`
		SELECT * FROM (
			SELECT DISTINCT ON (mi.id)
				mi.id,
				mi.status,
				mi.purchase_status,
				mi.title,
				mi.type,
				mi.cover_image_url,
				inst.rating,
				inst.completed_at,
				mi.expected_release_date,
				mi.series_id,
				s.name AS series_name
			FROM media_item_instances inst
			JOIN media_items mi ON inst.media_item_id = mi.id
			JOIN genres g ON mi.genre_id = g.id
			LEFT JOIN series s ON mi.series_id = s.id
			WHERE
				mi.user_id = ${userId}
				AND inst.completed_at IS NOT NULL
				AND inst.completed_at >= ${startDate}
				AND inst.completed_at <= ${endDate}
				AND g.name = ${genre}
				${typeFilterSql}
			ORDER BY mi.id, inst.completed_at DESC
		) sub
		ORDER BY sub.completed_at DESC
	`);

	return rows.rows.map(mapDrillDownRow);
}
