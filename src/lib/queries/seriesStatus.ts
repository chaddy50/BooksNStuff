import { MediaItemStatus } from "#/lib/enums";

function isDoneStatus(status: MediaItemStatus): boolean {
	return (
		status === MediaItemStatus.COMPLETED || status === MediaItemStatus.DROPPED
	);
}

/** All items finished — DROPPED wins over COMPLETED if any item was dropped. */
function resolveAllDoneStatus(doneItems: MediaItemStatus[]): MediaItemStatus {
	return doneItems.some((s) => s === MediaItemStatus.DROPPED)
		? MediaItemStatus.DROPPED
		: MediaItemStatus.COMPLETED;
}

/** The series is deliberately paused — waiting for releases, or on hold. */
function resolvePausedStatus(
	activeItems: MediaItemStatus[],
): MediaItemStatus | null {
	if (
		activeItems.every((s) => s === MediaItemStatus.WAITING_FOR_NEXT_RELEASE)
	) {
		return MediaItemStatus.WAITING_FOR_NEXT_RELEASE;
	}
	if (activeItems.some((s) => s === MediaItemStatus.ON_HOLD)) {
		return MediaItemStatus.ON_HOLD;
	}
	return null;
}

/** An in-progress item dominates; otherwise the series may be done or paused. */
function resolveStatusFromActiveItems(
	doneItems: MediaItemStatus[],
	activeItems: MediaItemStatus[],
): MediaItemStatus | null {
	if (activeItems.some((s) => s === MediaItemStatus.IN_PROGRESS)) {
		return MediaItemStatus.IN_PROGRESS;
	}
	if (activeItems.length === 0) {
		return resolveAllDoneStatus(doneItems);
	}
	return resolvePausedStatus(activeItems);
}

/**
 * Some items done, some still remaining — series is in progress, unless the
 * user deliberately paused/parked it and nothing is genuinely active yet.
 * This is a soft inference, not a hard fact, so it shouldn't silently
 * override a deliberate pause the way a genuinely in-progress item does.
 */
function resolvePartiallyDoneStatus(
	currentStatus: MediaItemStatus | undefined,
): MediaItemStatus {
	if (currentStatus === MediaItemStatus.ON_HOLD) return currentStatus;
	if (currentStatus === MediaItemStatus.WAITING_FOR_NEXT_RELEASE) {
		return currentStatus;
	}
	return MediaItemStatus.IN_PROGRESS;
}

/**
 * Derive the series status from its items' statuses.
 * Returns null when no status update is warranted (all items are still BACKLOG).
 */
export function inferSeriesStatus(
	statuses: MediaItemStatus[],
	currentStatus?: MediaItemStatus,
): MediaItemStatus | null {
	if (statuses.length === 0) {
		return null;
	}

	const doneItems = statuses.filter(isDoneStatus);
	const activeItems = statuses.filter((s) => !isDoneStatus(s));

	const activeStatus = resolveStatusFromActiveItems(doneItems, activeItems);
	if (activeStatus) {
		return activeStatus;
	}

	if (doneItems.length > 0) {
		return resolvePartiallyDoneStatus(currentStatus);
	}

	// No items started yet — leave series status as-is
	return null;
}
