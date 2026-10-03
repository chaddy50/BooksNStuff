import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

// The app's own layout scrolls an `overflow-y-auto` ancestor rather than
// `window` (see src/routes/_authenticated/_app.tsx), so this walks up from
// the given element to find whichever ancestor actually scrolls, falling
// back to `window` for layouts that do scroll the page itself.
function findScrollableAncestor(
	element: HTMLElement | null,
): HTMLElement | Window {
	let current = element;
	while (current) {
		const { overflowY } = window.getComputedStyle(current);
		if (overflowY === "auto" || overflowY === "scroll") {
			return current;
		}
		current = current.parentElement;
	}
	return window;
}

function readScrollPosition(scrollable: HTMLElement | Window): number {
	return scrollable === window
		? window.scrollY
		: (scrollable as HTMLElement).scrollTop;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Tracks how many pixels of the header (0..headerHeight) should currently be
 * hidden, moving 1:1 with the scroll delta rather than snapping — scrolling
 * down hides it exactly as fast as the content moves, and any upward scroll
 * immediately starts bringing it back, matching a native collapsing toolbar.
 */
export function useHeaderScrollOffset(
	elementRef: RefObject<HTMLElement | null>,
	headerHeight: number,
) {
	const [hiddenHeight, setHiddenHeight] = useState(0);
	const hiddenHeightRef = useRef(0);
	const previousScrollPositionRef = useRef(0);

	useEffect(() => {
		const scrollable = findScrollableAncestor(elementRef.current);

		function handleScroll() {
			const currentScrollPosition = readScrollPosition(scrollable);
			const delta = currentScrollPosition - previousScrollPositionRef.current;
			// Also capped to the actual scroll position so the header can never
			// hide more than the page has scrolled - otherwise a gap would open
			// above the content near the top.
			const nextHiddenHeight = Math.min(
				clamp(hiddenHeightRef.current + delta, 0, headerHeight),
				currentScrollPosition,
			);

			hiddenHeightRef.current = nextHiddenHeight;
			previousScrollPositionRef.current = currentScrollPosition;
			setHiddenHeight(nextHiddenHeight);
		}

		scrollable.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			scrollable.removeEventListener("scroll", handleScroll);
		};
	}, [elementRef, headerHeight]);

	return hiddenHeight;
}
