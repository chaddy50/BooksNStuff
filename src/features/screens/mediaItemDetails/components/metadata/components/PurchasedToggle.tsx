import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useToast } from "#/components/hooks/useToast";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	type MediaItemDetails,
	setPurchaseStatus,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { PurchaseStatus } from "#/lib/enums";

interface PurchasedToggleProps {
	mediaItemDetails: MediaItemDetails;
}

export function PurchasedToggle({ mediaItemDetails }: PurchasedToggleProps) {
	const router = useRouter();
	const { t } = useTranslation();
	const { toast } = useToast();

	async function handleChange(value: string) {
		try {
			await setPurchaseStatus({
				data: {
					mediaItemId: mediaItemDetails.id,
					purchaseStatus: value as PurchaseStatus,
				},
			});
			router.invalidate();
		} catch {
			toast(t("mediaItemDetails.purchaseStatusUpdateFailed"), {
				variant: "destructive",
			});
		}
	}

	return (
		<Select
			value={mediaItemDetails.purchaseStatus}
			onValueChange={handleChange}
		>
			<SelectTrigger className="w-40">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{Object.values(PurchaseStatus).map((status) => (
					<SelectItem key={status} value={status}>
						{t(`purchaseStatus.${status}`)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
