import { BookConsumptionMethod, MediaItemType } from "#/lib/enums";

export function isPhysicalBookFormat(consumptionMethod?: string): boolean {
	return (
		consumptionMethod === BookConsumptionMethod.HARDCOVER ||
		consumptionMethod === BookConsumptionMethod.PAPERBACK
	);
}

/** Page-number entry only applies to a known, positive page count on a physical copy; e-book and audiobook always use percent. */
export function resolveEffectivePageCount(
	mediaItemType: MediaItemType,
	pageCount: number | undefined,
	consumptionMethod: string | undefined,
): number | undefined {
	const isPageBasedProgress =
		mediaItemType === MediaItemType.BOOK &&
		pageCount != null &&
		pageCount > 0 &&
		isPhysicalBookFormat(consumptionMethod);
	return isPageBasedProgress ? pageCount : undefined;
}

export function percentToPageNumber(
	progressPercent: number,
	pageCount: number,
): number {
	return Math.round((progressPercent / 100) * pageCount);
}

export function pageNumberToPercent(
	pageNumber: number,
	pageCount: number,
): number {
	return Math.min(100, Math.max(0, (pageNumber / pageCount) * 100));
}

export function formatProgressInputValue(
	progressPercent: number | null | undefined,
	pageCount?: number,
): string {
	if (progressPercent == null) return "";
	return pageCount
		? String(percentToPageNumber(progressPercent, pageCount))
		: String(progressPercent);
}

export function parseProgressInputValue(
	value: string,
	pageCount?: number,
): string | undefined {
	if (!value) return undefined;
	const parsedValue = Number(value);
	const percent = pageCount
		? pageNumberToPercent(parsedValue, pageCount)
		: parsedValue;
	return percent.toFixed(4);
}
