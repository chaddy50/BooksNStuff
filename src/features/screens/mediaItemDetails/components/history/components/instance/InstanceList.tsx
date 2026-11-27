import { useTranslation } from "react-i18next";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { InstanceRow } from "./InstanceRow";

interface InstanceListProps {
	mediaItemDetails: MediaItemDetails;
	onEdit: (instanceId: number) => void;
}

export function InstanceList(props: InstanceListProps) {
	const { mediaItemDetails, onEdit } = props;
	const { t } = useTranslation();

	if (mediaItemDetails.instances.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				{t("mediaItemDetails.noInstances")}
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{mediaItemDetails.instances.map((instance, idx) => (
				<InstanceRow
					key={instance.id}
					index={idx + 1}
					instance={instance}
					status={mediaItemDetails.status}
					statusChangedAt={mediaItemDetails.statusChangedAt}
					onEdit={() => onEdit(instance.id)}
				/>
			))}
		</div>
	);
}
