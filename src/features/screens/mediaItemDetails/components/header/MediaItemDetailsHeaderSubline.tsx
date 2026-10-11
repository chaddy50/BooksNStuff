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

function CreatorOrPlainText(props: {
	creatorId: number | null | undefined;
	value: string;
}) {
	const { creatorId, value } = props;
	return creatorId ? (
		<CreatorLink creatorId={creatorId} creatorName={value} />
	) : (
		<span>{value}</span>
	);
}

function SeriesOrPlainText(props: {
	seriesId: number | null | undefined;
	value: string;
}) {
	const { seriesId, value } = props;
	return seriesId ? (
		<SeriesLink seriesId={seriesId} seriesName={value} />
	) : (
		<span>{value}</span>
	);
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
			node: (
				<CreatorOrPlainText
					creatorId={mediaItemDetails.creatorId}
					value={mediaItemDetails.creatorName ?? creatorValue}
				/>
			),
		});
	}
	if (seriesLabel) {
		segments.push({
			key: "series",
			node: (
				<SeriesOrPlainText
					seriesId={mediaItemDetails.seriesId}
					value={seriesLabel}
				/>
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
