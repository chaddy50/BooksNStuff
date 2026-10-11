import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "#/features/screens/settings/SettingsScreen";

function renderSettingsScreen() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<SettingsScreen />
		</QueryClientProvider>,
	);
}

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({ useSearch: () => ({ tab: "tags" }) }),
	useNavigate: () => vi.fn(),
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: () => <div data-testid="top-bar" />,
}));

vi.mock("#/features/screens/settings/components/SettingsTabStrip", () => ({
	SettingsTabStrip: () => <div data-testid="tab-strip" />,
}));

vi.mock("#/features/screens/settings/settingsTabs", () => ({
	getSettingsTab: () => ({
		id: "defaults",
		labelKey: "stub.label",
		descriptionKey: "stub.description",
		Component: () => <div data-testid="active-tab-panel" />,
	}),
}));

vi.mock("#/features/screens/settings/components/UserInfo", () => ({
	UserInfo: () => <div data-testid="user-info" />,
}));

vi.mock("#/features/screens/settings/components/AppearanceSection", () => ({
	AppearanceSection: () => <div data-testid="appearance-section" />,
}));

vi.mock("#/features/screens/settings/components/BackupSection", () => ({
	BackupSection: () => <div data-testid="backup-section" />,
}));

afterEach(cleanup);

describe("SettingsScreen sidebar", () => {
	it("shows Appearance between Account and Backup, outside the tab panel", () => {
		renderSettingsScreen();

		const sidebarChildren =
			screen.getByTestId("user-info").parentElement?.children;
		const testIds = Array.from(sidebarChildren ?? []).map((element) =>
			element.getAttribute("data-testid"),
		);

		expect(testIds).toEqual([
			"user-info",
			"appearance-section",
			"backup-section",
		]);
		expect(screen.getByTestId("active-tab-panel")).toBeInTheDocument();
	});
});
