import { describe, expect, it, vi } from "vitest";
import type { ZodObject } from "zod";

// The route module pulls in the whole screen and the view server functions just
// to build its options object; neither is under test here.
vi.mock("#/features/screens/customView/CustomViewScreen", () => ({
	ViewScreen: () => null,
}));
vi.mock("#/features/screens/customView/view", () => ({
	getViewResults: vi.fn(),
	getViewStats: vi.fn(),
}));

import { Route } from "../views.$viewId";

type RemountDeps = NonNullable<typeof Route.options.remountDeps>;

/** Calls `remountDeps` the way the router does, with only the parts it reads. */
function getRemountKey(viewId: string, titleQuery?: string) {
	const remountDeps: RemountDeps | undefined = Route.options.remountDeps;
	if (!remountDeps) {
		throw new Error("Route declares no remountDeps");
	}

	return remountDeps({
		routeId: "/_authenticated/_app/views/$viewId",
		params: { viewId },
		search: { titleQuery },
		loaderDeps: { titleQuery },
	} as Parameters<RemountDeps>[0]);
}

describe("views.$viewId route remounting", () => {
	it("declares remountDeps so the screen is not reused across views", () => {
		expect(Route.options.remountDeps).toBeTypeOf("function");
	});

	it("keys the screen on the viewId param", () => {
		expect(getRemountKey("7")).toBe("7");
		expect(getRemountKey("8")).toBe("8");
	});

	// Keying on search too would remount on every keystroke in SearchInput and
	// steal focus mid-typing.
	it("ignores the search params", () => {
		expect(getRemountKey("7", "a")).toBe(getRemountKey("7", "ab"));
	});
});

describe("views.$viewId route validateSearch", () => {
	const validateSearch = Route.options.validateSearch as unknown as ZodObject<
		Record<string, never>
	>;

	// Previously only titleQuery/statuses/purchaseStatuses/filterOrder parsed —
	// the view's filter overlay now covers every filter dimension.
	it("accepts a filter dimension beyond the old statuses/purchaseStatuses whitelist", () => {
		const search = validateSearch.parse({
			genres: ["Philosophy"],
			purchaseStatuses: ["not_purchased"],
		});

		expect(search).toMatchObject({
			genres: ["Philosophy"],
			purchaseStatuses: ["not_purchased"],
		});
	});

	// Its only producer (StatsBar) stops writing it once the title-suffix it fed
	// is removed, so nothing reads it anymore.
	it("drops a filterOrder param, which is no longer a recognized key", () => {
		const search = validateSearch.parse({
			filterOrder: ["statuses"],
		});

		expect(search).not.toHaveProperty("filterOrder");
	});

	// The overlay can temporarily resort a view too, without saving it.
	it("accepts a sortBy and sortDirection override", () => {
		const search = validateSearch.parse({
			sortBy: "title",
			sortDirection: "desc",
		});

		expect(search).toMatchObject({ sortBy: "title", sortDirection: "desc" });
	});
});
