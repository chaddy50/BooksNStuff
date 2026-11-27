import { useRouter } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";

import { useUserSettings } from "#/components/hooks/useUserSettings";
import { Button } from "#/components/ui/button";
import { getDefaultConsumptionInfo } from "#/features/screens/mediaItemDetails/components/history/components/instance/consumptionUtils";
import { ProgressField } from "#/features/screens/mediaItemDetails/components/history/components/instance/ProgressField";
import {
	formatProgressInputValue,
	parseProgressInputValue,
	resolveEffectivePageCount,
} from "#/features/screens/mediaItemDetails/components/history/components/instance/progressInputUtils";
import { InstanceMetaLine } from "#/features/screens/mediaItemDetails/components/InstanceMetaLine";
import {
	getConsumptionLabel,
	getDateSegment,
} from "#/features/screens/mediaItemDetails/instanceMetaLabels";
import {
	type MediaItemDetails,
	updateInstanceProgress,
	updateMediaItemStatus,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus, type MediaItemType } from "#/lib/enums";
import { getLocalDateString } from "#/lib/utils";

interface MediaItemDetailsHeaderCurrentInstanceProps {
	instance: MediaItemDetails["instances"][number];
	mediaItemId: number;
	mediaItemType: MediaItemType;
	status: MediaItemStatus;
	statusChangedAt: string | null;
	pageCount?: number;
	onReviewAndComplete: () => void;
}

export function MediaItemDetailsHeaderCurrentInstance(
	props: MediaItemDetailsHeaderCurrentInstanceProps,
) {
	const {
		instance,
		mediaItemId,
		status,
		statusChangedAt,
		pageCount,
		onReviewAndComplete,
	} = props;
	const { t } = useTranslation();
	const router = useRouter();
	const { data: settings } = useUserSettings();
	const effectiveConsumptionInfo =
		instance.consumptionInfo ??
		getDefaultConsumptionInfo(props.mediaItemType, settings);
	const effectivePageCount = resolveEffectivePageCount(
		props.mediaItemType,
		pageCount,
		effectiveConsumptionInfo.method,
	);
	const [progressInputValue, setProgressInputValue] = useState(
		formatProgressInputValue(instance.progressPercent, effectivePageCount),
	);
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

	const isInProgress = status === MediaItemStatus.IN_PROGRESS;
	const isOnHold = status === MediaItemStatus.ON_HOLD;
	const captionLabels = [
		getDateSegment(status, statusChangedAt, instance, t as never),
		getConsumptionLabel(effectiveConsumptionInfo, t as (key: string) => string),
	].filter((label): label is string => label !== null);

	async function handleProgressBlur() {
		const parsedProgressPercent = parseProgressInputValue(
			progressInputValue,
			effectivePageCount,
		);
		if (parsedProgressPercent === undefined) return;
		await updateInstanceProgress({
			data: {
				instanceId: instance.id,
				progressPercent: parsedProgressPercent,
				today: getLocalDateString(new Date()),
			},
		});
		router.invalidate();
	}

	async function handleStatusChange(nextStatus: MediaItemStatus) {
		setIsUpdatingStatus(true);
		try {
			await updateMediaItemStatus({
				data: {
					mediaItemId,
					status: nextStatus,
					today: getLocalDateString(new Date()),
				},
			});
			router.invalidate();
		} finally {
			setIsUpdatingStatus(false);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<h3 className="text-base font-semibold">
				{t(`status.${status}` as never)}
			</h3>
			<InstanceMetaLine labels={captionLabels} />

			{isInProgress && (
				<ProgressField
					completedAt=""
					progressPercent={progressInputValue}
					onProgressPercentChange={setProgressInputValue}
					onBlur={handleProgressBlur}
					pageCount={effectivePageCount}
				/>
			)}

			<div className="flex items-center gap-2">
				{isInProgress ? (
					<Fragment>
						<Button onClick={onReviewAndComplete} disabled={isUpdatingStatus}>
							{t("mediaItemDetails.reviewAndComplete")}
						</Button>
						<Button
							variant="outline"
							onClick={() => handleStatusChange(MediaItemStatus.ON_HOLD)}
							disabled={isUpdatingStatus}
						>
							{t("status.on_hold")}
						</Button>
						<Button
							variant="outline"
							onClick={() => handleStatusChange(MediaItemStatus.DROPPED)}
							disabled={isUpdatingStatus}
						>
							{t("mediaItemDetails.markAsDropped")}
						</Button>
					</Fragment>
				) : (
					<Fragment>
						<Button
							onClick={() => handleStatusChange(MediaItemStatus.IN_PROGRESS)}
							disabled={isUpdatingStatus}
						>
							{t("mediaItemDetails.resume")}
						</Button>
						{isOnHold && (
							<Button
								variant="outline"
								onClick={() => handleStatusChange(MediaItemStatus.DROPPED)}
								disabled={isUpdatingStatus}
							>
								{t("mediaItemDetails.markAsDropped")}
							</Button>
						)}
					</Fragment>
				)}
			</div>
		</div>
	);
}
