import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#/components/ui/tooltip";
import { SearchInput } from "#/features/navigation/topBar/components/SearchInput";

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

afterEach(cleanup);

describe("SearchInput", () => {
	it("stretches to fill its row below md, reverting to a fixed width at md and up", () => {
		render(
			<TooltipProvider>
				<SearchInput value="" navigateTo="/library" />
			</TooltipProvider>,
		);

		expect(screen.getByPlaceholderText("Search...")).toHaveClass(
			"w-full",
			"md:w-48",
		);
	});

	it("matches the filter button's 44px tap-target height below md", () => {
		render(
			<TooltipProvider>
				<SearchInput value="" navigateTo="/library" />
			</TooltipProvider>,
		);

		expect(screen.getByPlaceholderText("Search...")).toHaveClass("max-md:h-11");
	});
});
