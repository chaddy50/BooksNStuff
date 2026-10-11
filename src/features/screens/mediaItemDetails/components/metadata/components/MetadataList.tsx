import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemType } from "#/lib/enums";
import { formatHours, formatMinutes } from "#/lib/utils";

type Field = { label: string; value: string };
type FieldBuilder = (
	metadata: Record<string, unknown>,
	t: TFunction,
) => Field[];

function bookFields(metadata: Record<string, unknown>, t: TFunction): Field[] {
	if (typeof metadata.pageCount !== "number") return [];

	const fields: Field[] = [
		{ label: t("metadata.pageCount"), value: `${metadata.pageCount}` },
	];
	// ~300 WPM x 275 words/page / 60 min/hr = 65 pages/hour (HowLongToRead.com methodology)
	const readingHours = Math.round(metadata.pageCount / 65);
	if (readingHours >= 1) {
		fields.push({
			label: t("metadata.readingTime"),
			value: formatHours(readingHours, t),
		});
	}
	return fields;
}

function movieFields(metadata: Record<string, unknown>, t: TFunction): Field[] {
	if (typeof metadata.runtime !== "number") return [];
	return [
		{ label: t("metadata.runtime"), value: formatMinutes(metadata.runtime, t) },
	];
}

function tvShowFields(
	metadata: Record<string, unknown>,
	t: TFunction,
): Field[] {
	const fields: Field[] = [];
	if (typeof metadata.seasons === "number") {
		fields.push({ label: t("metadata.seasons"), value: `${metadata.seasons}` });
	}
	if (
		typeof metadata.episodeRuntime === "number" &&
		typeof metadata.numberOfEpisodes === "number"
	) {
		const totalHours = Math.round(
			(metadata.episodeRuntime * metadata.numberOfEpisodes) / 60,
		);
		if (totalHours >= 1) {
			fields.push({
				label: t("metadata.totalRuntime"),
				value: formatHours(totalHours, t),
			});
		}
	}
	return fields;
}

function videoGameFields(
	metadata: Record<string, unknown>,
	t: TFunction,
): Field[] {
	const fields: Field[] = [];
	if (Array.isArray(metadata.platforms) && metadata.platforms.length) {
		fields.push({
			label: t("metadata.platforms"),
			value: metadata.platforms.join(", "),
		});
	}
	if (typeof metadata.timeToBeatHastily === "number") {
		fields.push({
			label: t("timeToBeat.hastily"),
			value: formatHours(metadata.timeToBeatHastily, t),
		});
	}
	if (typeof metadata.timeToBeatNormally === "number") {
		fields.push({
			label: t("timeToBeat.normally"),
			value: formatHours(metadata.timeToBeatNormally, t),
		});
	}
	if (typeof metadata.timeToBeatCompletely === "number") {
		fields.push({
			label: t("timeToBeat.completely"),
			value: formatHours(metadata.timeToBeatCompletely, t),
		});
	}
	return fields;
}

function podcastFields(
	metadata: Record<string, unknown>,
	t: TFunction,
): Field[] {
	const fields: Field[] = [];
	if (Array.isArray(metadata.episodeTitles) && metadata.episodeTitles.length) {
		fields.push({
			label: t("podcast.episodes"),
			value:
				metadata.episodeTitles.length === 1
					? String(metadata.episodeTitles[0])
					: `${metadata.episodeTitles.length} ${t("podcast.episodesCount")}`,
		});
	}
	if (
		typeof metadata.totalDuration === "number" &&
		metadata.totalDuration > 0
	) {
		fields.push({
			label: t("metadata.runtime"),
			value: formatMinutes(metadata.totalDuration, t),
		});
	}
	return fields;
}

const FIELD_BUILDER_BY_TYPE: Record<MediaItemType, FieldBuilder> = {
	[MediaItemType.BOOK]: bookFields,
	[MediaItemType.MOVIE]: movieFields,
	[MediaItemType.TV_SHOW]: tvShowFields,
	[MediaItemType.VIDEO_GAME]: videoGameFields,
	[MediaItemType.PODCAST]: podcastFields,
};

// Creator, series, release year, and tags live in the media item header instead;
// this list only covers the remaining, less headline details.
export function MetadataList({
	type,
	metadata,
	genreId,
	genreName,
}: {
	type: MediaItemDetails["type"];
	metadata: MediaItemDetails["metadata"];
	genreId?: number | null;
	genreName?: string | null;
}) {
	const { t } = useTranslation();
	const fields = metadata
		? FIELD_BUILDER_BY_TYPE[type](metadata as Record<string, unknown>, t)
		: [];

	const hasContent = fields.length > 0 || !!genreName;
	if (!hasContent) return null;

	return (
		<div className="flex flex-col gap-1.5 text-sm">
			{fields.map(({ label, value }) => (
				<Fragment key={label}>
					<div className="flex gap-3">
						<span className="text-muted-foreground w-28 shrink-0">{label}</span>
						<span className="text-foreground">{value}</span>
					</div>
				</Fragment>
			))}
			{genreName && genreId && (
				<div className="flex gap-3">
					<span className="text-muted-foreground w-28 shrink-0">
						{t("metadata.genre")}
					</span>
					<Link
						to="/genre/$genreId"
						params={{ genreId: String(genreId) }}
						className="text-foreground hover:underline"
					>
						{genreName}
					</Link>
				</div>
			)}
		</div>
	);
}
