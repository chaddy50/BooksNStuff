import { TypeBadge } from "#/components/TypeBadge";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";

interface TitleProps {
	mediaItemDetails: MediaItemDetails;
}

export function Title(props: TitleProps) {
	const { mediaItemDetails } = props;
	return (
		<h1 className="text-3xl font-bold leading-tight">
			{mediaItemDetails.title}{" "}
			<TypeBadge
				type={mediaItemDetails.type}
				className="inline-flex align-middle"
			/>
		</h1>
	);
}
