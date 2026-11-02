import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { mediaTypeEnum } from "#/database/schema";
import { InsightsScreen } from "#/features/screens/insights/InsightsScreen";
import { getInsightsReports } from "#/features/screens/reports/reports";
import { insightsDateRangeSchema } from "#/features/screens/reports/types";
import { applyInsightsDateRangeDefaults } from "#/features/screens/reports/utils";
import {
	getUserSettings,
	resolveInsightsItemTypes,
} from "#/features/screens/settings/settings";

const insightsSearchSchema = insightsDateRangeSchema.extend({
	itemTypes: z.array(z.enum(mediaTypeEnum.enumValues)).optional(),
});

export const Route = createFileRoute("/_authenticated/_app/insights")({
	validateSearch: insightsSearchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => {
		const settings = await getUserSettings();
		const itemTypes = resolveInsightsItemTypes(deps, settings);
		const reports = await getInsightsReports({
			data: { ...applyInsightsDateRangeDefaults(deps), itemTypes },
		});
		return { reports, itemTypes };
	},
	component: InsightsScreen,
});
