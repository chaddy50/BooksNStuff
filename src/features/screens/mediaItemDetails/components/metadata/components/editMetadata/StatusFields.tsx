import { useTranslation } from "react-i18next";

import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { PurchasedToggle } from "../PurchasedToggle";
import { StatusSelect } from "../StatusSelect";
import { FormField } from "./FormField";

interface StatusFieldsProps {
	mediaItemDetails: MediaItemDetails;
}

export function StatusFields({ mediaItemDetails }: StatusFieldsProps) {
	const { t } = useTranslation();

	return (
		<div className="flex items-center gap-4">
			<FormField label={t("metadata.status")}>
				<StatusSelect mediaItemDetails={mediaItemDetails} />
			</FormField>
			<FormField label={t("metadata.purchaseStatus")}>
				<PurchasedToggle mediaItemDetails={mediaItemDetails} />
			</FormField>
		</div>
	);
}
