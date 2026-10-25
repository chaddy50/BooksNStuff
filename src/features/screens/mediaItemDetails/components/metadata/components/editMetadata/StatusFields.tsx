import { useTranslation } from "react-i18next";

import type {
	MediaItemDetails,
	SeriesCompletionConfirmation,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { PurchasedToggle } from "../PurchasedToggle";
import { StatusSelect } from "../StatusSelect";
import { FormField } from "./FormField";

interface StatusFieldsProps {
	mediaItemDetails: MediaItemDetails;
	onSeriesCompletionNeeded: (
		confirmation: SeriesCompletionConfirmation,
	) => void;
}

export function StatusFields({
	mediaItemDetails,
	onSeriesCompletionNeeded,
}: StatusFieldsProps) {
	const { t } = useTranslation();

	return (
		<div className="flex items-center gap-4">
			<FormField label={t("metadata.status")}>
				<StatusSelect
					mediaItemDetails={mediaItemDetails}
					onSeriesCompletionNeeded={onSeriesCompletionNeeded}
				/>
			</FormField>
			<FormField label={t("metadata.purchaseStatus")}>
				<PurchasedToggle mediaItemDetails={mediaItemDetails} />
			</FormField>
		</div>
	);
}
