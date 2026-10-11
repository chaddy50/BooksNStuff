import { useTranslation } from "react-i18next";

import { CreatorAvatar } from "#/components/CreatorAvatar";
import { ExpandableTextBlock } from "#/components/ExpandableTextBlock";
import { ProfileStatsRow } from "#/components/ProfileStatsRow";
import type { CreatorDetails } from "#/features/screens/creatorDetails/creatorDetails";
import { EditCreatorDialog } from "./EditCreatorDialog";

interface CreatorInfoProps {
	creatorDetails: CreatorDetails;
}

export function CreatorInfo({ creatorDetails }: CreatorInfoProps) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-5 mb-10">
			<div className="flex items-start gap-4">
				<CreatorAvatar name={creatorDetails.name} />
				<div className="flex flex-1 flex-col gap-1">
					<div className="flex items-start justify-between gap-2">
						<CreatorNameAndRole creatorDetails={creatorDetails} />
						<EditCreatorDialog creatorDetails={creatorDetails} />
					</div>
					<ProfileStatsRow stats={creatorDetails.stats} />
				</div>
			</div>

			{creatorDetails.biography && (
				<div>
					<h2 className="text-sm font-medium text-muted-foreground mb-1">
						{t("creatorDetails.biography")}
					</h2>
					<ExpandableTextBlock text={creatorDetails.biography} />
				</div>
			)}
		</div>
	);
}

function CreatorNameAndRole({ creatorDetails }: CreatorInfoProps) {
	const { t } = useTranslation();

	return (
		<div className="flex items-center gap-2">
			<h1 className="text-3xl font-bold leading-tight">
				{creatorDetails.name}
			</h1>
			{creatorDetails.role && (
				<span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
					{t(`metadata.${creatorDetails.role}`)}
				</span>
			)}
		</div>
	);
}
