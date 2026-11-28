import { useTranslation } from "react-i18next";
import { Description } from "#/features/screens/mediaItemDetails/components/metadata/components/Description";
import { ExpectedReleaseDateInput } from "#/features/screens/mediaItemDetails/components/metadata/components/ExpectedReleaseDateInput";
import { MetadataList } from "#/features/screens/mediaItemDetails/components/metadata/components/MetadataList";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { SectionLabel } from "../SectionLabel";

interface OverviewTabProps {
	mediaItemDetails: MediaItemDetails;
}

export function OverviewTab(props: OverviewTabProps) {
	const { mediaItemDetails } = props;
	const { t } = useTranslation();

	return (
		<div>
			<SectionLabel>{t("mediaItemDetails.details")}</SectionLabel>
			<div className="flex flex-col gap-5 mt-3">
				<ExpectedReleaseDateInput mediaItemDetails={mediaItemDetails} />
				<Description mediaItemDetails={mediaItemDetails} />
				<MetadataList
					type={mediaItemDetails.type}
					metadata={mediaItemDetails.metadata}
					releaseDate={mediaItemDetails.releaseDate}
					genreId={mediaItemDetails.genreId}
					genreName={mediaItemDetails.genreName}
				/>
			</div>
		</div>
	);
}
