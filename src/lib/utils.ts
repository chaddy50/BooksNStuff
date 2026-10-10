import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import type { TFunction } from "i18next";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function findLastIndexWhere<T>(
	items: T[],
	predicate: (item: T) => boolean,
): number {
	let lastIndex = -1;
	for (let index = 0; index < items.length; index++) {
		if (predicate(items[index])) {
			lastIndex = index;
		}
	}
	return lastIndex;
}

/**
 * Structural comparison for plain data — primitives, arrays, and plain objects.
 * Object key order is ignored. `Date`, `Map`, `Set`, and class instances are out
 * of contract and compare by reference.
 */
export function isDeepEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) {
		return true;
	}

	if (
		a === null ||
		b === null ||
		typeof a !== "object" ||
		typeof b !== "object"
	) {
		return false;
	}

	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
			return false;
		}
		return a.every((element, index) => isDeepEqual(element, b[index]));
	}

	const aEntries = Object.entries(a);
	if (aEntries.length !== Object.keys(b).length) {
		return false;
	}

	return aEntries.every(
		([key, value]) =>
			Object.hasOwn(b, key) &&
			isDeepEqual(value, (b as Record<string, unknown>)[key]),
	);
}

export function toTitleCase(text: string): string {
	return text
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}

export function formatDate(dateStr: string | null | undefined): string | null {
	if (!dateStr) return null;
	return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "2-digit",
	});
}

export function formatHours(hours: number, t: TFunction): string {
	return `${hours} ${hours === 1 ? t("time.hour") : t("time.hours")}`;
}

export function formatMinutes(totalMinutes: number, t: TFunction): string {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) {
		return `${minutes} ${t("time.min")}`;
	}
	if (minutes === 0) {
		return formatHours(hours, t);
	}
	return `${formatHours(hours, t)} ${minutes} ${t("time.min")}`;
}

export function formatDateRange(
	startedAt: string | null | undefined,
	completedAt: string | null | undefined,
): string | null {
	const start = formatDate(startedAt);
	const end = formatDate(completedAt);

	if (startedAt === completedAt) {
		// If the item was started and completed on the same date, just show that date
		return start;
	}

	if (start && end) {
		return `${start} – ${end}`;
	} else if (start) {
		return `${start} – Present`;
	} else if (end) {
		return end;
	} else {
		return null;
	}
}
