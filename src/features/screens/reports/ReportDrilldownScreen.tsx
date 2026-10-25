import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { MediaItemCard } from "#/components/MediaItemCard";
import { TopBar } from "#/features/navigation/topBar/TopBar";

const route = getRouteApi(
	"/_authenticated/_details/reports/$reportType/drilldown",
);

export function ReportDrilldownScreen() {
	const items = route.useLoaderData();
	const { key } = route.useSearch();
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar shouldShowBackButton title={formatKey(key)} />
			<div className="px-4 md:px-6 py-6 max-w-5xl mx-auto">
				{items.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-8">
						{t("insights.report.noItems")}
					</p>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
						{items.map((item) => (
							<MediaItemCard key={item.id} mediaItem={item} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// ---- Private helpers

const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

function formatKey(rawKey: string): string {
	const match = MONTH_KEY_PATTERN.exec(rawKey);
	if (!match) {
		return rawKey;
	}
	const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
	return date.toLocaleString("default", { month: "long", year: "numeric" });
}
