import { useTranslation } from "react-i18next";

import { ProgressBar } from "#/components/ProgressBar";
import { InstanceMetaLine } from "#/features/screens/mediaItemDetails/components/InstanceMetaLine";
import { getInstanceMetaLabels } from "#/features/screens/mediaItemDetails/instanceMetaLabels";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { getLogProgressLabelKey } from "#/features/screens/mediaItemDetails/mediaItemDetailsHeader";
import { MediaItemStatus, type MediaItemType } from "#/lib/enums";

interface MediaItemDetailsHeaderCurrentInstanceProps {
	instance: MediaItemDetails["instances"][number];
	mediaItemType: MediaItemType;
	status: MediaItemStatus;
	statusChangedAt: string | null;
	onClick: () => void;
}

export function MediaItemDetailsHeaderCurrentInstance(
	props: MediaItemDetailsHeaderCurrentInstanceProps,
) {
	const { instance, mediaItemType, status, statusChangedAt, onClick } = props;
	const { t } = useTranslation();

	const metaLabels = getInstanceMetaLabels(
		instance,
		status,
		statusChangedAt,
		t as (key: string, options?: Record<string, unknown>) => string,
	);

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={t(getLogProgressLabelKey(mediaItemType, true) as never)}
			className="flex flex-col gap-1.5 rounded-md border border-border bg-accent/50 px-4 py-2.5 text-left text-foreground transition-colors hover:bg-accent overflow-hidden -mb-px"
		>
			<InstanceMetaLine labels={metaLabels} />
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
