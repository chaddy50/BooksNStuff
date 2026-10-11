import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { formatReleaseYear } from "#/lib/releaseDate";

interface MediaItemDetailsHeaderSublineProps {
	mediaItemDetails: MediaItemDetails;
}

export function MediaItemDetailsHeaderSubline(
	props: MediaItemDetailsHeaderSublineProps,
) {
	const { mediaItemDetails } = props;
	const { t } = useTranslation();

	const releaseYear = formatReleaseYear(mediaItemDetails.releaseDate, t);

	const segments: Array<{ key: string; node: React.ReactNode }> = [];
	if (mediaItemDetails.genreName && mediaItemDetails.genreId) {
		segments.push({
			key: "genre",
			node: (
				<Link
					to="/genre/$genreId"
					params={{ genreId: String(mediaItemDetails.genreId) }}
					className="hover:underline"
				>
					{mediaItemDetails.genreName}
				</Link>
			),
		});
	}
	if (releaseYear) {
		segments.push({ key: "year", node: <span>{releaseYear}</span> });
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
