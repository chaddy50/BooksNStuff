import { Monitor, Moon, Sun } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "#/components/hooks/useTheme";
import type { ThemeMode } from "#/lib/theme/theme";
import { cn } from "#/lib/utils";

type ThemeModeOption = {
	value: ThemeMode;
	labelKey: string;
	Icon: ComponentType<{ className?: string }>;
};

const THEME_MODE_OPTIONS: ThemeModeOption[] = [
	{ value: "light", labelKey: "settings.appearance.light", Icon: Sun },
	{ value: "dark", labelKey: "settings.appearance.dark", Icon: Moon },
	{ value: "system", labelKey: "settings.appearance.system", Icon: Monitor },
];

export function AppearanceSection() {
	const { t } = useTranslation();
	const { themeMode, setThemeMode } = useTheme();

	return (
		<section className="flex flex-col gap-4">
			<div>
				<h2 className="text-lg font-semibold">
					{t("settings.appearance.title")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("settings.appearance.description")}
				</p>
			</div>
			<div className="flex flex-col gap-2">
				<div
					role="radiogroup"
					aria-label={t("settings.appearance.title")}
					className="inline-flex w-fit items-center gap-1 rounded-md border border-input p-1"
				>
					{THEME_MODE_OPTIONS.map(({ value, labelKey, Icon }) => {
						const isSelected = themeMode === value;
						const inputId = `theme-mode-${value}`;
						return (
							<div key={value}>
								<input
									type="radio"
									id={inputId}
									name="theme-mode"
									value={value}
									checked={isSelected}
									onChange={() => setThemeMode(value)}
									className="sr-only"
								/>
								<label
									htmlFor={inputId}
									className={cn(
										"inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
										isSelected
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<Icon className="size-4" />
									{t(labelKey as never)}
								</label>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
