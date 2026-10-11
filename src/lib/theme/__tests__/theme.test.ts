// @vitest-environment jsdom
// src/lib/** is not in the config's jsdom globs; this suite needs browser globals.

import * as vm from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	buildThemeInitScript,
	isThemeMode,
	persistThemeMode,
	readStoredThemeMode,
	resolveIsDarkTheme,
	resolveSystemPrefersDark,
	THEME_STORAGE_KEY,
} from "#/lib/theme/theme";

function mockSystemPrefersDark(matches: boolean) {
	vi.spyOn(window, "matchMedia").mockReturnValue({
		matches,
		media: "(prefers-color-scheme: dark)",
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	} as unknown as MediaQueryList);
}

describe("isThemeMode", () => {
	it("accepts exactly the three known theme modes", () => {
		expect(isThemeMode("light")).toBe(true);
		expect(isThemeMode("dark")).toBe(true);
		expect(isThemeMode("system")).toBe(true);
	});

	it("rejects anything else", () => {
		expect(isThemeMode("blue")).toBe(false);
		expect(isThemeMode(undefined)).toBe(false);
		expect(isThemeMode(null)).toBe(false);
		expect(isThemeMode(42)).toBe(false);
	});
});

describe("readStoredThemeMode", () => {
	afterEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it("returns the stored mode when it is valid", () => {
		localStorage.setItem(THEME_STORAGE_KEY, "dark");
		expect(readStoredThemeMode()).toBe("dark");
	});

	it("falls back to system when nothing is stored", () => {
		expect(readStoredThemeMode()).toBe("system");
	});

	it("falls back to system when the stored value is invalid", () => {
		localStorage.setItem(THEME_STORAGE_KEY, "blue");
		expect(readStoredThemeMode()).toBe("system");
	});

	it("falls back to system when localStorage throws", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("storage disabled");
		});
		expect(readStoredThemeMode()).toBe("system");
	});
});

describe("resolveSystemPrefersDark", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reflects the OS prefers-color-scheme: dark media query", () => {
		mockSystemPrefersDark(true);
		expect(resolveSystemPrefersDark()).toBe(true);

		mockSystemPrefersDark(false);
		expect(resolveSystemPrefersDark()).toBe(false);
	});
});

describe("resolveIsDarkTheme", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("is dark for the dark mode regardless of OS preference", () => {
		mockSystemPrefersDark(false);
		expect(resolveIsDarkTheme("dark")).toBe(true);
	});

	it("is light for the light mode regardless of OS preference", () => {
		mockSystemPrefersDark(true);
		expect(resolveIsDarkTheme("light")).toBe(false);
	});

	it("follows the OS preference for the system mode", () => {
		mockSystemPrefersDark(true);
		expect(resolveIsDarkTheme("system")).toBe(true);

		mockSystemPrefersDark(false);
		expect(resolveIsDarkTheme("system")).toBe(false);
	});
});

describe("persistThemeMode", () => {
	afterEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it("saves the mode under the theme storage key", () => {
		persistThemeMode("dark");
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
	});

	it("does not throw when localStorage is unavailable", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("storage disabled");
		});
		expect(() => persistThemeMode("light")).not.toThrow();
	});
});

describe("buildThemeInitScript", () => {
	// Runs the generated script in an isolated vm sandbox instead of the real
	// document, so this proves the script's own logic without eval/Function.
	function runInitScript(
		storedMode: string | null,
		systemPrefersDark: boolean,
	): boolean {
		const classList = new Set<string>();
		const sandbox = {
			localStorage: { getItem: () => storedMode },
			window: { matchMedia: () => ({ matches: systemPrefersDark }) },
			document: {
				documentElement: {
					classList: {
						toggle: (name: string, force: boolean) => {
							if (force) {
								classList.add(name);
							} else {
								classList.delete(name);
							}
						},
					},
				},
			},
		};
		vm.createContext(sandbox);
		vm.runInContext(buildThemeInitScript(), sandbox);
		return classList.has("dark");
	}

	it("applies the dark class when dark is stored", () => {
		expect(runInitScript("dark", false)).toBe(true);
	});

	it("leaves the dark class off when light is stored", () => {
		expect(runInitScript("light", true)).toBe(false);
	});

	it("falls back to the OS preference when nothing is stored", () => {
		expect(runInitScript(null, true)).toBe(true);
	});
});
