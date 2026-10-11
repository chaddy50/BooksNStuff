import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "#/components/hooks/useTheme";
import { AppearanceSection } from "#/features/screens/settings/components/AppearanceSection";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

function renderAppearanceSection() {
	return render(
		<ThemeProvider>
			<AppearanceSection />
		</ThemeProvider>,
	);
}

afterEach(() => {
	cleanup();
	localStorage.clear();
	document.documentElement.classList.remove("dark");
	vi.restoreAllMocks();
});

describe("AppearanceSection", () => {
	it("renders its own title and description, like the other sidebar sections", () => {
		renderAppearanceSection();

		expect(
			screen.getByRole("heading", { name: "settings.appearance.title" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("settings.appearance.description"),
		).toBeInTheDocument();
	});

	it("renders the three theme options", () => {
		renderAppearanceSection();

		expect(
			screen.getByRole("radio", { name: "settings.appearance.light" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("radio", { name: "settings.appearance.dark" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("radio", { name: "settings.appearance.system" }),
		).toBeInTheDocument();
	});

	it("marks system as selected by default", () => {
		renderAppearanceSection();

		expect(
			screen.getByRole("radio", { name: "settings.appearance.system" }),
		).toBeChecked();
	});

	it("selecting Dark applies the dark class and marks it as checked", () => {
		renderAppearanceSection();

		fireEvent.click(
			screen.getByRole("radio", { name: "settings.appearance.dark" }),
		);

		expect(
			screen.getByRole("radio", { name: "settings.appearance.dark" }),
		).toBeChecked();
		expect(
			screen.getByRole("radio", { name: "settings.appearance.system" }),
		).not.toBeChecked();
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});
});
