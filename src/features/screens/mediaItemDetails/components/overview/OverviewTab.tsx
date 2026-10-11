import { Description } from "#/features/screens/mediaItemDetails/components/metadata/components/Description";
import { ExpectedReleaseDateInput } from "#/features/screens/mediaItemDetails/components/metadata/components/ExpectedReleaseDateInput";
import { MetadataList } from "#/features/screens/mediaItemDetails/components/metadata/components/MetadataList";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";

interface OverviewTabProps {
	mediaItemDetails: MediaItemDetails;
}

export function OverviewTab(props: OverviewTabProps) {
	const { mediaItemDetails } = props;

	return (
		<div className="flex flex-col gap-5">
			<ExpectedReleaseDateInput mediaItemDetails={mediaItemDetails} />
			<Description mediaItemDetails={mediaItemDetails} />
			<MetadataList
				type={mediaItemDetails.type}
				metadata={mediaItemDetails.metadata}
			/>
		</div>
	);
}
