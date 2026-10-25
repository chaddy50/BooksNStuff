import type { ConsumptionInfo } from "#/database/schema";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus } from "#/lib/enums";
import { formatDate, formatDateRange } from "#/lib/utils";

type Instance = MediaItemDetails["instances"][number];
type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export function getConsumptionLabel(
	info: ConsumptionInfo | null,
	t: (key: string) => string,
): string | null {
	if (!info) return null;
	if (info.controlMethod) {
		return `${t(`consumption.gamePlatform.${info.method}`)} · ${t(`consumption.controlMethod.${info.controlMethod}`)}`;
	}
	return t(`consumption.method.${info.method}`);
}

export function getProgressLabel(
	progressPercent: number | null,
	completedAt: string | null,
	t: TranslateFn,
): string | null {
	if (completedAt != null) return null;
	if (progressPercent == null) return null;
	return t("mediaItemDetails.progressComplete", {
		percent: Math.round(progressPercent),
	});
}

const STATUS_CHANGE_LABEL_KEY: Partial<Record<MediaItemStatus, string>> = {
	[MediaItemStatus.ON_HOLD]: "mediaItemDetails.onHoldSince",
	[MediaItemStatus.DROPPED]: "mediaItemDetails.droppedOn",
};

/**
 * The shared "what date should this instance show" rule, used anywhere an
 * instance's current status needs to read the same way as the media item
 * details header's current-instance summary card.
 */
export function getDateSegment(
	status: MediaItemStatus,
	statusChangedAt: string | null,
	instance: Instance,
	t: TranslateFn,
): string | null {
	const statusChangeLabelKey = STATUS_CHANGE_LABEL_KEY[status];
	if (statusChangeLabelKey) {
		if (!statusChangedAt) return null;
		return t(statusChangeLabelKey, { date: formatDate(statusChangedAt) });
	}
	return formatDateRange(instance.startedAt, instance.completedAt);
}

/** The ordered, filtered meta labels shown alongside an instance: date/status, consumption method, and progress. */
export function getInstanceMetaLabels(
	instance: Instance,
	status: MediaItemStatus,
	statusChangedAt: string | null,
	t: TranslateFn,
): string[] {
	const dateSegment = getDateSegment(status, statusChangedAt, instance, t);
	const consumptionLabel = getConsumptionLabel(
		instance.consumptionInfo,
		t as (key: string) => string,
	);
	const progressLabel = getProgressLabel(
		instance.progressPercent,
		instance.completedAt,
		t,
	);
	return [dateSegment, consumptionLabel, progressLabel].filter(
		(label): label is string => label !== null,
	);
}
