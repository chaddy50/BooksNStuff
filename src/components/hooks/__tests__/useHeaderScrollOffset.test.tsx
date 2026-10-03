import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHeaderScrollOffset } from "#/components/hooks/useHeaderScrollOffset";

const HEADER_HEIGHT_PX = 100;
const noScrollableAncestorRef = { current: null };

function scrollTo(scrollY: number) {
	Object.defineProperty(window, "scrollY", {
		value: scrollY,
		configurable: true,
	});
	act(() => {
		window.dispatchEvent(new Event("scroll"));
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useHeaderScrollOffset", () => {
	it("is fully revealed (zero offset) before any scroll event", () => {
		const { result } = renderHook(() =>
			useHeaderScrollOffset(noScrollableAncestorRef, HEADER_HEIGHT_PX),
		);

		expect(result.current).toBe(0);
	});

	it("hides by exactly the scrolled distance while scrolling down, not all at once", () => {
		const { result } = renderHook(() =>
			useHeaderScrollOffset(noScrollableAncestorRef, HEADER_HEIGHT_PX),
		);

		scrollTo(30);

		expect(result.current).toBe(30);
	});

	it("clamps the hidden offset to the header's own height once fully hidden", () => {
		const { result } = renderHook(() =>
			useHeaderScrollOffset(noScrollableAncestorRef, HEADER_HEIGHT_PX),
		);

		scrollTo(400);

		expect(result.current).toBe(HEADER_HEIGHT_PX);
	});

	it("comes back by exactly the scrolled distance on any upward scroll, without waiting to reach the top", () => {
		const { result } = renderHook(() =>
			useHeaderScrollOffset(noScrollableAncestorRef, HEADER_HEIGHT_PX),
		);

		scrollTo(400);
		scrollTo(385);

		expect(result.current).toBe(HEADER_HEIGHT_PX - 15);
	});

	it("never hides more than the page has actually scrolled, so no gap opens above the content near the top", () => {
		const { result } = renderHook(() =>
			useHeaderScrollOffset(noScrollableAncestorRef, HEADER_HEIGHT_PX),
		);

		scrollTo(40);

		expect(result.current).toBe(40);
	});

	it("never goes negative when scrolling up past fully revealed", () => {
		const { result } = renderHook(() =>
			useHeaderScrollOffset(noScrollableAncestorRef, HEADER_HEIGHT_PX),
		);

		scrollTo(20);
		scrollTo(0);

		expect(result.current).toBe(0);
	});

	// The app's own scroll boundary never scrolls `window` (see
	// src/routes/_authenticated/_app.tsx) -- it scrolls a `overflow-y-auto`
	// ancestor instead, so the hook has to find and listen on that ancestor.
	it("tracks the nearest scrollable ancestor instead of the window when one exists", () => {
		const scrollContainer = document.createElement("div");
		const child = document.createElement("div");
		scrollContainer.appendChild(child);
		document.body.appendChild(scrollContainer);

		vi.spyOn(window, "getComputedStyle").mockImplementation(
			(element) =>
				({
					overflowY: element === scrollContainer ? "auto" : "visible",
				}) as CSSStyleDeclaration,
		);

		const { result } = renderHook(() =>
			useHeaderScrollOffset({ current: child }, HEADER_HEIGHT_PX),
		);

		Object.defineProperty(scrollContainer, "scrollTop", {
			value: 45,
			configurable: true,
		});
		act(() => scrollContainer.dispatchEvent(new Event("scroll")));

		expect(result.current).toBe(45);

		document.body.removeChild(scrollContainer);
	});
});
