import type { FilterAndSortOptions } from "#/database/schema";

/**
 * Lives apart from `view.ts`/`view.server.ts` so both can import it: `view.ts`
 * already imports from `view.server.ts`, so the reverse import isn't possible
 * from either file.
 */
export type ViewFilterOverrides = FilterAndSortOptions;

/**
 * Merges a view's saved filters with transient overrides from the URL (the
 * search box, a stats-bar click, or the view's own filter overlay). Any
 * explicitly-provided override field replaces the base value; a field absent
 * from `overrides` falls back to `base`. `titleQuery` is always taken from
 * `overrides`, even when undefined (clearing it) — a view's saved filters
 * never carry one of their own. This never writes back to the view's own
 * saved filters.
 */
export function applyViewFilterOverrides(
	baseFilters: FilterAndSortOptions | null,
	overrides: ViewFilterOverrides,
): FilterAndSortOptions {
	const definedOverrides = Object.fromEntries(
		Object.entries(overrides).filter(([, value]) => value !== undefined),
	);
	return {
		...(baseFilters ?? {}),
		...definedOverrides,
		titleQuery: overrides.titleQuery,
	} as FilterAndSortOptions;
}
