import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { SeriesLink } from "#/components/SeriesLink";
import { CreatorLink } from "#/features/screens/mediaItemDetails/components/metadata/components/CreatorLink";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { formatReleaseYear } from "#/lib/releaseDate";
import {
	getPrimaryCreatorValue,
	getSeriesLabel,
} from "./mediaItemDetailsHeaderSubline";

interface MediaItemDetailsHeaderSublineProps {
	mediaItemDetails: MediaItemDetails;
}

export function MediaItemDetailsHeaderSubline(
	props: MediaItemDetailsHeaderSublineProps,
) {
	const { mediaItemDetails } = props;
	const { t } = useTranslation();

	const creatorValue = getPrimaryCreatorValue(
		mediaItemDetails.type,
		mediaItemDetails.metadata,
	);
	const seriesLabel = getSeriesLabel(
		mediaItemDetails.type,
		mediaItemDetails.metadata,
		mediaItemDetails.seriesName,
	);
	const releaseYear = formatReleaseYear(mediaItemDetails.releaseDate, t);

	const segments: Array<{ key: string; node: React.ReactNode }> = [];
	if (releaseYear) {
		segments.push({ key: "year", node: <span>{releaseYear}</span> });
	}
	if (creatorValue) {
		segments.push({
			key: "creator",
			node: mediaItemDetails.creatorId ? (
				<CreatorLink
					creatorId={mediaItemDetails.creatorId}
					creatorName={mediaItemDetails.creatorName ?? creatorValue}
				/>
			) : (
				<span>{creatorValue}</span>
			),
		});
	}
	if (seriesLabel) {
		segments.push({
			key: "series",
			node: mediaItemDetails.seriesId ? (
				<SeriesLink
					seriesId={mediaItemDetails.seriesId}
					seriesName={seriesLabel}
				/>
			) : (
				<span>{seriesLabel}</span>
			),
		});
	}

	if (segments.length === 0) return null;

	return (
		<p
			className="text-white/80 text-sm"
			data-testid="media-item-details-header-subline"
		>
			{segments.map(({ key, node }, index) => (
				<Fragment key={key}>
					{index > 0 && <span className="mx-1.5">·</span>}
					{node}
				</Fragment>
			))}
		</p>
	);
}
