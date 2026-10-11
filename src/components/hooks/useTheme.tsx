import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	persistThemeMode,
	readStoredThemeMode,
	resolveIsDarkTheme,
	type ThemeMode,
} from "#/lib/theme/theme";

type ThemeContextValue = {
	themeMode: ThemeMode;
	setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
		readStoredThemeMode(),
	);

	useEffect(() => {
		persistThemeMode(themeMode);
		document.documentElement.classList.toggle(
			"dark",
			resolveIsDarkTheme(themeMode),
		);
	}, [themeMode]);

	useEffect(() => {
		if (themeMode !== "system") {
			return () => {};
		}

		const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
		function handleSystemThemeChange() {
			document.documentElement.classList.toggle(
				"dark",
				resolveIsDarkTheme("system"),
			);
		}
		systemThemeQuery.addEventListener("change", handleSystemThemeChange);
		return () => {
			systemThemeQuery.removeEventListener("change", handleSystemThemeChange);
		};
	}, [themeMode]);

	return (
		<ThemeContext.Provider value={{ themeMode, setThemeMode }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const value = useContext(ThemeContext);
	if (value === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return value;
}
