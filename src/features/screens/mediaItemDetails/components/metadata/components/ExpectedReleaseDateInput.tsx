import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useToast } from "#/components/hooks/useToast";
import { Input } from "#/components/ui/input";
import {
	type MediaItemDetails,
	setMediaItemExpectedReleaseDate,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus } from "#/lib/enums";

interface ExpectedReleaseDateInputProps {
	mediaItemDetails: MediaItemDetails;
}

export function ExpectedReleaseDateInput({
	mediaItemDetails,
}: ExpectedReleaseDateInputProps) {
	const router = useRouter();
	const { t } = useTranslation();
	const { toast } = useToast();

	if (mediaItemDetails.status !== MediaItemStatus.WAITING_FOR_NEXT_RELEASE) {
		return null;
	}

	async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		try {
			await setMediaItemExpectedReleaseDate({
				data: {
					mediaItemId: mediaItemDetails.id,
					expectedReleaseDate: event.target.value || null,
				},
			});
			router.invalidate();
		} catch {
			toast(t("mediaItemDetails.expectedReleaseDateUpdateFailed"), {
				variant: "destructive",
			});
		}
	}

	return (
		<div className="flex gap-3 text-sm">
			<span className="text-muted-foreground w-28 shrink-0">
				{t("mediaItemDetails.expectedReleaseDate")}
			</span>
			<Input
				type="date"
				className="w-44 h-auto py-0 text-sm"
				value={mediaItemDetails.expectedReleaseDate ?? ""}
				onChange={handleChange}
			/>
		</div>
	);
}
