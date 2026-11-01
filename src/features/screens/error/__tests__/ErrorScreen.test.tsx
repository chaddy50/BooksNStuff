import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorScreen } from "#/features/screens/error/ErrorScreen";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
		<a href={to}>{children}</a>
	),
}));

afterEach(() => {
	cleanup();
});

describe("ErrorScreen", () => {
	it("tells the user something went wrong without leaking the error message", () => {
		render(
			<ErrorScreen
				error={new Error("database connection refused")}
				reset={vi.fn()}
			/>,
		);

		expect(screen.getByText("errorScreen.title")).toBeInTheDocument();
		expect(
			screen.queryByText(/database connection refused/),
		).not.toBeInTheDocument();
	});

	it("calls reset when Try Again is clicked", () => {
		const reset = vi.fn();
		render(<ErrorScreen error={new Error("boom")} reset={reset} />);

		fireEvent.click(screen.getByText("errorScreen.tryAgain"));

		expect(reset).toHaveBeenCalledTimes(1);
	});

	it("links back home", () => {
		render(<ErrorScreen error={new Error("boom")} reset={vi.fn()} />);

		expect(screen.getByRole("link", { name: /nav.home/ })).toHaveAttribute(
			"href",
			"/",
		);
	});
});
