// @vitest-environment jsdom
// src/routes/** is not in the config's jsdom globs; this suite needs it.

import { describe, expect, it } from "vitest";
import { buildThemeInitScript } from "#/lib/theme/theme";

describe("root route theme init script", () => {
	it("includes the theme init script as a blocking head script", async () => {
		const { Route } = await import("#/routes/__root");
		const head = await Route.options.head?.({} as never);

		expect(head?.scripts).toEqual([{ children: buildThemeInitScript() }]);
	});
});
