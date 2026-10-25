import {
	ChartColumn,
	Layers,
	LayoutDashboard,
	Library,
	Menu,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { BottomNavItem } from "./components/BottomNavItem";
import { NavDrawer } from "./components/NavDrawer";

export function BottomNavBar() {
	const { t } = useTranslation();
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	return (
		<>
			<nav className="fixed bottom-0 left-0 right-0 md:hidden z-20 bg-card border-t border-border flex items-stretch h-16">
				<BottomNavItem
					to="/"
					exact={true}
					icon={<LayoutDashboard className="size-5" />}
					label={t("nav.dashboard")}
				/>
				<BottomNavItem
					to="/library"
					icon={<Library className="size-5" />}
					label={t("nav.library")}
				/>
				<BottomNavItem
					to="/series"
					icon={<Layers className="size-5" />}
					label={t("nav.series")}
				/>
				<BottomNavItem
					to="/insights"
					icon={<ChartColumn className="size-5" />}
					label={t("nav.insights")}
				/>
				<button
					type="button"
					onClick={() => setIsDrawerOpen(true)}
					className="flex flex-col items-center justify-center gap-0.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex-1 cursor-pointer"
				>
					<Menu className="size-5" />
					<span>{t("nav.menu")}</span>
				</button>
			</nav>
			<NavDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
		</>
	);
}
