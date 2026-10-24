import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { ProgressBar } from "#/components/ProgressBar";
import {
	getConsumptionLabel,
	getProgressLabel,
} from "#/features/screens/mediaItemDetails/components/history/components/instance/InstanceRow";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { getLogProgressLabelKey } from "#/features/screens/mediaItemDetails/mediaItemDetailsHeader";
import { MediaItemStatus, type MediaItemType } from "#/lib/enums";
import { formatDateRange } from "#/lib/utils";

interface MediaItemDetailsHeaderCurrentInstanceProps {
	instance: MediaItemDetails["instances"][number];
	mediaItemType: MediaItemType;
	onClick: () => void;
}

export function MediaItemDetailsHeaderCurrentInstance(
	props: MediaItemDetailsHeaderCurrentInstanceProps,
) {
	const { instance, mediaItemType, onClick } = props;
	const { t } = useTranslation();

	const dateRange = formatDateRange(instance.startedAt, instance.completedAt);
	const consumptionLabel = getConsumptionLabel(
		instance.consumptionInfo,
		t as (key: string) => string,
	);
	const progressLabel = getProgressLabel(
		instance.progressPercent,
		instance.completedAt,
		t as (key: string, options?: Record<string, unknown>) => string,
	);
	const metaLabels = [dateRange, consumptionLabel, progressLabel].filter(
		(label): label is string => label !== null,
	);

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={t(getLogProgressLabelKey(mediaItemType, true) as never)}
			className="flex flex-col gap-1.5 rounded-md border border-border bg-accent/50 px-4 py-2.5 text-left text-foreground transition-colors hover:bg-accent overflow-hidden -mb-px"
		>
			<div className="text-sm">
				{metaLabels.map((label, index) => (
					<Fragment key={label}>
						{index > 0 && (
							<span className="mx-1.5" aria-hidden="true">
								·
							</span>
						)}
						<span>{label}</span>
					</Fragment>
				))}
			</div>
			<div className="-mx-4 -mb-2.5">
				<ProgressBar
					status={MediaItemStatus.IN_PROGRESS}
					progressPercent={instance.progressPercent}
					className="h-1"
				/>
			</div>
		</button>
	);
}
