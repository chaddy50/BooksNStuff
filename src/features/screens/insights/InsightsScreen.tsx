import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { TopBar } from "#/features/navigation/topBar/TopBar";
import { applyInsightsDateRangeDefaults } from "#/features/screens/reports/utils";
import { updateUserSettings } from "#/features/screens/settings/settings";
import type { MediaItemType } from "#/lib/enums";
import { DateRangePicker } from "./components/dateRangePicker/DateRangePicker";
import { ItemTypeFilter } from "./components/ItemTypeFilter";
import { ReportTile } from "./components/ReportTile";

const route = getRouteApi("/_authenticated/_app/insights");

export function InsightsScreen() {
	const { reports, itemTypes } = route.useLoaderData();
	const search = route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const { startDate, endDate } = applyInsightsDateRangeDefaults(search);

	async function persistItemTypes(nextItemTypes: MediaItemType[]) {
		navigate({
			to: "/insights",
			search: (previous) => ({ ...previous, itemTypes: nextItemTypes }),
		});

		await updateUserSettings({
			data: { defaultInsightsItemTypes: nextItemTypes },
		});
		await queryClient.invalidateQueries({ queryKey: ["userSettings"] });
	}

	function handleToggleItemType(itemType: MediaItemType) {
		const nextItemTypes = itemTypes.includes(itemType)
			? itemTypes.filter((type) => type !== itemType)
			: [...itemTypes, itemType];
		return persistItemTypes(nextItemTypes);
	}

	function handleClearItemTypes() {
		return persistItemTypes([]);
	}

	return (
		<div className="min-h-dvh flex flex-col bg-background text-foreground">
			<TopBar
				title={t("insights.title")}
				right={
					<div className="flex items-center gap-2">
						<ItemTypeFilter
							selectedItemTypes={itemTypes}
							onToggle={handleToggleItemType}
							onClear={handleClearItemTypes}
						/>
						<DateRangePicker
							startDate={startDate}
							endDate={endDate}
							onApply={(range) =>
								navigate({
									to: "/insights",
									search: (previous) => ({ ...previous, ...range }),
								})
							}
						/>
					</div>
				}
			/>
			<main className="px-4 md:px-6 py-2 flex-1 min-h-0">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{reports.map(({ reportType, data }) => (
						<ReportTile
							key={reportType}
							reportType={reportType}
							data={data}
							itemTypes={itemTypes}
							startDate={startDate}
							endDate={endDate}
						/>
					))}
				</div>
			</main>
		</div>
	);
}
