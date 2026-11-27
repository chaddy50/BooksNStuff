import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "#/components/hooks/useIsMobile";

type FakeMediaQueryList = MediaQueryList & {
	fireChange: (matches: boolean) => void;
};

function installFakeMatchMedia(initialMatches: boolean): FakeMediaQueryList {
	let matches = initialMatches;
	const listeners = new Set<(event: MediaQueryListEvent) => void>();
	const fakeMediaQueryList = {
		get matches() {
			return matches;
		},
		media: "(max-width: 767px)",
		addEventListener: (
			_event: string,
			listener: (event: MediaQueryListEvent) => void,
		) => {
			listeners.add(listener);
		},
		removeEventListener: (
			_event: string,
			listener: (event: MediaQueryListEvent) => void,
		) => {
			listeners.delete(listener);
		},
		fireChange: (nextMatches: boolean) => {
			matches = nextMatches;
			for (const listener of listeners) {
				listener({ matches } as MediaQueryListEvent);
			}
		},
	} as FakeMediaQueryList;

	vi.spyOn(window, "matchMedia").mockReturnValue(fakeMediaQueryList);
	return fakeMediaQueryList;
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("useIsMobile", () => {
	it("returns false when the viewport does not match the mobile breakpoint", () => {
		installFakeMatchMedia(false);

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);
	});

	it("returns true when the viewport matches the mobile breakpoint", () => {
		installFakeMatchMedia(true);

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(true);
	});

	it("updates when the viewport crosses the mobile breakpoint", () => {
		const fakeMediaQueryList = installFakeMatchMedia(false);
		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(false);

		act(() => fakeMediaQueryList.fireChange(true));

		expect(result.current).toBe(true);
	});
});
