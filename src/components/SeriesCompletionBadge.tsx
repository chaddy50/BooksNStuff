import { useTranslation } from "react-i18next";

interface SeriesCompletionBadgeProps {
	isComplete: boolean;
}

export function SeriesCompletionBadge({
	isComplete,
}: SeriesCompletionBadgeProps) {
	const { t } = useTranslation();

	if (isComplete) {
		return (
			<span className="text-xs px-2 py-0.5 rounded-full bg-green-800 text-green-100 shrink-0">
				{t("seriesDetails.complete")}
			</span>
		);
	}

	return (
		<span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground shrink-0">
			{t("seriesDetails.ongoing")}
		</span>
	);
}
