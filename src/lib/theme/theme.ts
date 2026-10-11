export const THEME_STORAGE_KEY = "theme";

export type ThemeMode = "light" | "dark" | "system";

const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];

export function isThemeMode(value: unknown): value is ThemeMode {
	return THEME_MODES.includes(value as ThemeMode);
}

export function readStoredThemeMode(): ThemeMode {
	try {
		const storedValue = localStorage.getItem(THEME_STORAGE_KEY);
		return isThemeMode(storedValue) ? storedValue : "system";
	} catch {
		return "system";
	}
}

export function resolveSystemPrefersDark(): boolean {
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveIsDarkTheme(mode: ThemeMode): boolean {
	if (mode === "system") {
		return resolveSystemPrefersDark();
	}
	return mode === "dark";
}

export function persistThemeMode(mode: ThemeMode): void {
	try {
		localStorage.setItem(THEME_STORAGE_KEY, mode);
	} catch {
		// Private browsing or storage-disabled environments throw on write;
		// the in-memory theme state still applies for the current session.
	}
}

// Runs as inline JS before hydration, so it can't import the functions above.
export function buildThemeInitScript(): string {
	return `(function () {
	try {
		var storedMode = localStorage.getItem("${THEME_STORAGE_KEY}");
		var systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		var isDark = storedMode === "dark" || (storedMode !== "light" && systemPrefersDark);
		document.documentElement.classList.toggle("dark", isDark);
	} catch (error) {}
})();`;
}
