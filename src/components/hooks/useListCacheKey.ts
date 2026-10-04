import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

/**
 * Cache key for a paginated list, scoped to the history entry it was loaded on.
 *
 * Pages accumulated by scrolling are only worth restoring when the user comes back to
 * the very same history entry — pressing back out of a details screen. Reaching the
 * list again from the sidebar is a new entry and should start at page one. Keying on
 * `__TSR_key` is what makes that distinction, and it is the same key the router's
 * scroll restoration uses, so the restored rows and the restored scroll offset can
 * never disagree about which visit they belong to.
 *
 * The entry is captured at mount and re-read whenever `query` changes, rather than
 * subscribed to unconditionally. Applying a filter, sort, or search navigates this same
 * screen to a new history entry without unmounting it, so the entry captured at mount
 * would otherwise keep naming the one the user filtered away from. Scoping the re-read
 * to `query` changing is what tells that apart from `state.location` flipping to a
 * *different* screen's destination the moment a cross-screen navigation starts: this
 * screen's own query is untouched by that, so a still-visible list is never collapsed
 * back to page one for a frame on the way into an item.
 */
export function useListCacheKey(listName: string, query: unknown): string {
	const router = useRouter();
	const routerRef = useRef(router);
	const serializedQuery = JSON.stringify(query);
	const [historyEntryKey, setHistoryEntryKey] = useState(
		() => router.state.location.state.__TSR_key,
	);

	useEffect(() => {
		routerRef.current = router;
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: `serializedQuery` is only a trigger here, not read in the body — re-reading the key whenever it changes is the whole point
	useEffect(() => {
		setHistoryEntryKey(routerRef.current.state.location.state.__TSR_key);
	}, [serializedQuery]);

	return `${listName}:${historyEntryKey ?? ""}:${serializedQuery}`;
}
