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

afterEach(cleanup);

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
});
