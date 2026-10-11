import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { TopBar } from "#/features/navigation/topBar/TopBar";
import { AppearanceSection } from "./components/AppearanceSection";
import { BackupSection } from "./components/BackupSection";
import { SettingsTabStrip } from "./components/SettingsTabStrip";
import { UserInfo } from "./components/UserInfo";
import { getSettingsTab } from "./settingsTabs";
import type { SettingsTabId } from "./types";

const route = getRouteApi("/_authenticated/_app/settings");

export function SettingsScreen() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { tab } = route.useSearch();

	const activeTab = getSettingsTab(tab);
	const ActiveTabPanel = activeTab.Component;

	function handleSelectTab(tabId: SettingsTabId) {
		navigate({ to: "/settings", search: { tab: tabId } });
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar title={t("settings.title")} />
			<main className="px-4 md:px-6 py-6 grid items-start gap-10 md:grid-cols-4">
				<div className="flex flex-col gap-6 md:col-span-3">
					<SettingsTabStrip
						activeTabId={activeTab.id}
						onSelect={handleSelectTab}
					/>
					<div
						role="tabpanel"
						id={`settings-panel-${activeTab.id}`}
						aria-labelledby={`settings-tab-${activeTab.id}`}
						className="flex flex-col gap-4"
					>
						<p className="text-sm text-muted-foreground">
							{t(activeTab.descriptionKey as never)}
						</p>
						<ActiveTabPanel />
					</div>
				</div>

				<aside className="flex flex-col gap-10 md:col-span-1">
					<UserInfo />
					<AppearanceSection />
					<BackupSection />
				</aside>
			</main>
		</div>
	);
}
