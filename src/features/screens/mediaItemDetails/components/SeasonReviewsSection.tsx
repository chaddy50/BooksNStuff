import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import type { SeasonReview } from "#/database/schema";
import { SeasonReviewRow } from "#/features/screens/mediaItemDetails/components/history/components/instance/SeasonReviewRow";
import type { SeasonReviewsEditor } from "#/features/screens/mediaItemDetails/components/useSeasonReviewsEditor";

interface SeasonReviewsSectionProps {
	isTvShow: boolean;
	totalSeasons?: number;
	editor: SeasonReviewsEditor;
}

export function SeasonReviewsSection({
	isTvShow,
	totalSeasons,
	editor,
}: SeasonReviewsSectionProps) {
	const { t } = useTranslation();

	if (!isTvShow) return null;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium">
					{t("mediaItemDetails.seasonReviews")}
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={editor.addSeasonReview}
					disabled={editor.allSeasonsAdded}
				>
					{t("mediaItemDetails.addSeasonReview")}
				</Button>
			</div>

			{editor.seasonReviews.map((seasonReview, index) => (
				<SeasonReviewRow
					key={seasonReview.season}
					seasonReview={seasonReview}
					totalSeasons={totalSeasons}
					usedSeasons={editor.usedSeasons}
					isExpanded={editor.expandedSeasons.has(seasonReview.season)}
					onToggleExpanded={() =>
						editor.toggleExpandedSeason(seasonReview.season)
					}
					onChange={(patch: Partial<SeasonReview>) =>
						editor.updateSeasonReview(index, patch)
					}
					onRemove={() => editor.removeSeasonReview(index)}
				/>
			))}
		</div>
	);
}
