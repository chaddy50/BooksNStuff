import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "#/components/hooks/useTheme";
import { THEME_STORAGE_KEY } from "#/lib/theme/theme";

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
		media: "(prefers-color-scheme: dark)",
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

function isDarkClassApplied(): boolean {
	return document.documentElement.classList.contains("dark");
}

afterEach(() => {
	cleanup();
	localStorage.clear();
	document.documentElement.classList.remove("dark");
	vi.restoreAllMocks();
});

describe("useTheme", () => {
	it("throws when used outside a ThemeProvider", () => {
		expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
	});

	it("defaults to system and applies the OS-preferred class on mount", () => {
		installFakeMatchMedia(true);

		const { result } = renderHook(() => useTheme(), {
			wrapper: ThemeProvider,
		});

		expect(result.current.themeMode).toBe("system");
		expect(isDarkClassApplied()).toBe(true);
	});

	it("applying dark mode persists it and sets the dark class", () => {
		installFakeMatchMedia(false);
		const { result } = renderHook(() => useTheme(), {
			wrapper: ThemeProvider,
		});

		act(() => result.current.setThemeMode("dark"));

		expect(isDarkClassApplied()).toBe(true);
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
	});

	it("applying light mode removes the dark class even if the OS prefers dark", () => {
		installFakeMatchMedia(true);
		const { result } = renderHook(() => useTheme(), {
			wrapper: ThemeProvider,
		});

		act(() => result.current.setThemeMode("light"));

		expect(isDarkClassApplied()).toBe(false);
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
	});

	it("in system mode, follows a live OS theme change without calling setThemeMode", () => {
		const fakeMediaQueryList = installFakeMatchMedia(false);
		renderHook(() => useTheme(), { wrapper: ThemeProvider });
		expect(isDarkClassApplied()).toBe(false);

		act(() => fakeMediaQueryList.fireChange(true));

		expect(isDarkClassApplied()).toBe(true);
	});

	it("stops reacting to OS theme changes after switching away from system", () => {
		const fakeMediaQueryList = installFakeMatchMedia(false);
		const { result } = renderHook(() => useTheme(), {
			wrapper: ThemeProvider,
		});

		act(() => result.current.setThemeMode("light"));
		act(() => fakeMediaQueryList.fireChange(true));

		expect(isDarkClassApplied()).toBe(false);
	});
});
