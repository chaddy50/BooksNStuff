import { Fragment } from "react";

import { SeriesLink } from "#/components/SeriesLink";
import { CreatorLink } from "#/features/screens/mediaItemDetails/components/metadata/components/CreatorLink";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import {
	getPrimaryCreatorValue,
	getSeriesLabel,
} from "./mediaItemDetailsHeaderSubline";

interface MediaItemDetailsHeaderMetaListProps {
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

/** Creator and series only — release year and genre now live in the Overview details list instead. */
export function MediaItemDetailsHeaderMetaList(
	props: MediaItemDetailsHeaderMetaListProps,
) {
	const { mediaItemDetails } = props;

	const creatorValue = getPrimaryCreatorValue(
		mediaItemDetails.type,
		mediaItemDetails.metadata,
	);
	const seriesLabel = getSeriesLabel(
		mediaItemDetails.type,
		mediaItemDetails.metadata,
		mediaItemDetails.seriesName,
	);

	const segments: Array<{ key: string; node: React.ReactNode }> = [];
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
			className="text-foreground text-sm flex flex-wrap items-baseline gap-x-0"
			data-testid="media-item-details-header-meta-list"
		>
			{segments.map(({ key, node }, index) => {
				const isOwnLine = key === "creator" || key === "series";
				return (
					<Fragment key={key}>
						{index > 0 && !isOwnLine && <span className="mx-1.5">·</span>}
						<span className={isOwnLine ? "basis-full" : undefined}>{node}</span>
					</Fragment>
				);
			})}
		</p>
	);
}
