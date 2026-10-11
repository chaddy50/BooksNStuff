import type { ReactNode } from "react";
import { TypeBadge } from "#/components/TypeBadge";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";

interface TitleProps {
	mediaItemDetails: MediaItemDetails;
	children?: ReactNode;
}

export function Title(props: TitleProps) {
	const { mediaItemDetails, children } = props;
	return (
		<div className="flex items-center gap-3 flex-wrap">
			<h1 className="text-3xl font-bold leading-tight">
				{mediaItemDetails.title}
			</h1>
			<span className="shrink-0">
				<TypeBadge type={mediaItemDetails.type} />
			</span>
			{children}
		</div>
	);
}
