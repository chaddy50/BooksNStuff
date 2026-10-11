import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemType } from "#/lib/enums";
import { formatHours, formatMinutes } from "#/lib/utils";

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
	const fields: Array<{ label: string; value: string }> = [];

	if (metadata) {
		const m = metadata as Record<string, unknown>;
		switch (type) {
			case MediaItemType.BOOK:
				if (typeof m.pageCount === "number") {
					fields.push({
						label: t("metadata.pageCount"),
						value: `${m.pageCount}`,
					});
					// ~300 WPM x 275 words/page / 60 min/hr = 65 pages/hour (HowLongToRead.com methodology)
					const readingHours = Math.round((m.pageCount as number) / 65);
					if (readingHours >= 1) {
						fields.push({
							label: t("metadata.readingTime"),
							value: formatHours(readingHours, t),
						});
					}
				}
				break;
			case MediaItemType.MOVIE:
				if (typeof m.runtime === "number")
					fields.push({
						label: t("metadata.runtime"),
						value: formatMinutes(m.runtime as number, t),
					});
				break;
			case MediaItemType.TV_SHOW:
				if (typeof m.seasons === "number")
					fields.push({ label: t("metadata.seasons"), value: `${m.seasons}` });
				if (
					typeof m.episodeRuntime === "number" &&
					typeof m.numberOfEpisodes === "number"
				) {
					const totalHours = Math.round(
						((m.episodeRuntime as number) * (m.numberOfEpisodes as number)) /
							60,
					);
					if (totalHours >= 1) {
						fields.push({
							label: t("metadata.totalRuntime"),
							value: formatHours(totalHours, t),
						});
					}
				}
				break;
			case MediaItemType.VIDEO_GAME:
				if (Array.isArray(m.platforms) && m.platforms.length)
					fields.push({
						label: t("metadata.platforms"),
						value: m.platforms.join(", "),
					});
				if (typeof m.timeToBeatHastily === "number")
					fields.push({
						label: t("timeToBeat.hastily"),
						value: formatHours(m.timeToBeatHastily, t),
					});
				if (typeof m.timeToBeatNormally === "number")
					fields.push({
						label: t("timeToBeat.normally"),
						value: formatHours(m.timeToBeatNormally, t),
					});
				if (typeof m.timeToBeatCompletely === "number")
					fields.push({
						label: t("timeToBeat.completely"),
						value: formatHours(m.timeToBeatCompletely, t),
					});
				break;
			case MediaItemType.PODCAST:
				if (Array.isArray(m.episodeTitles) && m.episodeTitles.length) {
					fields.push({
						label: t("podcast.episodes"),
						value:
							m.episodeTitles.length === 1
								? String(m.episodeTitles[0])
								: `${m.episodeTitles.length} ${t("podcast.episodesCount")}`,
					});
				}
				if (typeof m.totalDuration === "number" && m.totalDuration > 0)
					fields.push({
						label: t("metadata.runtime"),
						value: formatMinutes(m.totalDuration as number, t),
					});
				break;
		}
	}

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
