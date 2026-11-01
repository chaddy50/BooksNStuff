import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	type MediaItemDetails,
	type SeriesCompletionConfirmation,
	updateMediaItemStatus,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus } from "#/lib/enums";
import { getLocalDateString } from "#/lib/utils";

interface StatusSelectProps {
	mediaItemDetails: MediaItemDetails;
	onSeriesCompletionNeeded: (
		confirmation: SeriesCompletionConfirmation,
	) => void;
}

export function StatusSelect(props: StatusSelectProps) {
	const { mediaItemDetails, onSeriesCompletionNeeded } = props;
	const router = useRouter();
	const { t } = useTranslation();

	async function handleStatusChange(status: string) {
		const confirmation = await updateMediaItemStatus({
			data: {
				mediaItemId: mediaItemDetails.id,
				status: status as MediaItemStatus,
				today: getLocalDateString(new Date()),
			},
		});
		router.invalidate();
		if (confirmation) {
			onSeriesCompletionNeeded(confirmation);
		}
	}

	return (
		<Select value={mediaItemDetails.status} onValueChange={handleStatusChange}>
			<SelectTrigger className="w-44">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{Object.values(MediaItemStatus).map((status) => (
					<SelectItem key={status} value={status}>
						{t(`status.${status}`)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
