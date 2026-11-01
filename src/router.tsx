import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,

		context: getContext(),

		scrollRestoration: true,
		// Restoration only ever touches `window` unless the nested scrollers are named.
		// Without this a forward navigation leaves the app's scroll container wherever
		// the previous screen left it, because nothing scrolls it back to the top.
		scrollToTopSelectors: ['[data-scroll-restoration-id="app-content"]'],
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}

	interface HistoryState {
		genreSuggestions?: string[];
	}
}
