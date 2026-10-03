import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TopBar } from "#/features/navigation/topBar/TopBar";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
	useRouter: () => ({ history: { back: vi.fn() } }),
}));

vi.mock("#/features/navigation/topBar/components/AddMediaButton", () => ({
	AddMediaButton: () => <button data-testid="add-media-button" type="button" />,
}));

let hiddenHeight = 0;

vi.mock("#/components/hooks/useHeaderScrollOffset", () => ({
	useHeaderScrollOffset: () => hiddenHeight,
}));

const originalOffsetHeight = Object.getOwnPropertyDescriptor(
	HTMLElement.prototype,
	"offsetHeight",
);

afterEach(() => {
	hiddenHeight = 0;
	if (originalOffsetHeight) {
		Object.defineProperty(
			HTMLElement.prototype,
			"offsetHeight",
			originalOffsetHeight,
		);
	}
	cleanup();
});

describe("TopBar", () => {
	it("gives the right slot its own full-width row below md", () => {
		render(
			<TopBar title="Library" right={<div data-testid="right-content" />} />,
		);

		const rightRow = screen.getByTestId("right-content").parentElement;
		expect(rightRow).toHaveClass("w-full", "md:w-auto");
	});

	it("keeps the add button visually after the right slot at md and up", () => {
		render(
			<TopBar title="Library" right={<div data-testid="right-content" />} />,
		);

		const addButtonWrapper =
			screen.getByTestId("add-media-button").parentElement;
		expect(addButtonWrapper).toHaveClass("md:order-last");
	});

	it("still renders without a right slot", () => {
		render(<TopBar title="Library" />);

		expect(screen.getByText("Library")).toBeInTheDocument();
	});

	it("keeps the header fully in place when nothing has been scrolled", () => {
		hiddenHeight = 0;
		render(<TopBar title="Library" />);

		const header = screen.getByTestId("top-bar-header");
		expect(header).toHaveStyle({ "--header-hidden-height": "0px" });
	});

	it("moves the header up by exactly the hidden amount reported by the scroll hook", () => {
		hiddenHeight = 37;
		render(<TopBar title="Library" />);

		const header = screen.getByTestId("top-bar-header");
		expect(header).toHaveStyle({ "--header-hidden-height": "-37px" });
	});

	it("keeps the header pinned at md and up regardless of the mobile hidden amount", () => {
		hiddenHeight = 37;
		render(<TopBar title="Library" />);

		const header = screen.getByTestId("top-bar-header");
		expect(header).toHaveClass("md:sticky", "md:translate-y-0");
	});

	it("reserves the header's rendered height as a mobile-only spacer when fully visible", () => {
		hiddenHeight = 0;
		Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
			configurable: true,
			value: 112,
		});

		render(<TopBar title="Library" />);

		const spacer = screen.getByTestId("top-bar-spacer");
		expect(spacer).toHaveClass("md:hidden");
		expect(spacer).toHaveStyle({ height: "112px" });
	});

	it("shrinks the spacer 1:1 with the hidden amount, so content fills the freed space immediately", () => {
		hiddenHeight = 40;
		Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
			configurable: true,
			value: 112,
		});

		render(<TopBar title="Library" />);

		const spacer = screen.getByTestId("top-bar-spacer");
		expect(spacer).toHaveStyle({ height: "72px" });
	});
});
