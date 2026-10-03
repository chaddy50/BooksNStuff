import { createFileRoute } from "@tanstack/react-router";
import { ViewScreen } from "#/features/screens/customView/CustomViewScreen";
import {
	getViewResults,
	getViewStats,
} from "#/features/screens/customView/view";
import { filterAndSortOptionsSchema } from "#/lib/filterAndSort";

export const Route = createFileRoute("/_authenticated/_app/views/$viewId")({
	// A view's temporary filter-and-sort overlay covers every filter dimension
	// plus sort, so the view can be narrowed or resorted without saving either.
	validateSearch: filterAndSortOptionsSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ params, deps }) => {
		const viewId = parseInt(params.viewId, 10);
		const [results, stats] = await Promise.all([
			getViewResults({ data: { viewId, ...deps } }),
			getViewStats({ data: { viewId, ...deps } }),
		]);
		return { ...results, stats };
	},
	staleTime: 30_000,
	// ViewScreen holds per-view reorder state (the pulled order list, the pending
	// save chain). Without a remount key the router reuses the instance across a
	// viewId change, so the next view inherits the previous view's reorder mode
	// and drops there would save the wrong items against it.
	remountDeps: ({ params }) => params.viewId,
	component: ViewScreen,
});
