import { useTranslation } from "react-i18next";
import { MediaItemStatus } from "#/lib/enums";

interface ProgressBarProps {
	status: MediaItemStatus;
	progressPercent: number | null | undefined;
	shouldShow?: boolean;
}

export function ProgressBar({
	status,
	progressPercent,
	shouldShow = true,
}: ProgressBarProps) {
	const { t } = useTranslation();
	if (
		!shouldShow ||
		status !== MediaItemStatus.IN_PROGRESS ||
		progressPercent == null
	) {
		return null;
	}

	return (
		<div
			role="progressbar"
			aria-valuenow={progressPercent}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={t("mediaItemDetails.progressComplete", {
				percent: progressPercent,
			})}
			className="w-full h-2.5 bg-black/60 backdrop-blur-sm border-t border-white/40"
		>
			<div
				className="h-full bg-[#a855f7]"
				style={{ width: `${progressPercent}%` }}
			/>
		</div>
	);
}
