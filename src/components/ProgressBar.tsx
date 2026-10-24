import { useTranslation } from "react-i18next";
import { MediaItemStatus } from "#/lib/enums";
import { cn } from "#/lib/utils";

interface ProgressBarProps {
	status: MediaItemStatus;
	progressPercent: number | null | undefined;
	shouldShow?: boolean;
	className?: string;
}

export function ProgressBar({
	status,
	progressPercent,
	shouldShow = true,
	className,
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
				percent: Math.round(progressPercent),
			})}
			className={cn(
				"w-full h-2.5 bg-black/60 backdrop-blur-sm border-t border-white/40",
				className,
			)}
		>
			<div
				className="h-full bg-[#a855f7]"
				style={{ width: `${progressPercent}%` }}
			/>
		</div>
	);
}
