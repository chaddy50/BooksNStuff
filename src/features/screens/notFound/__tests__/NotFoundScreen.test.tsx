import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotFoundScreen } from "#/features/screens/notFound/NotFoundScreen";

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

describe("NotFoundScreen", () => {
	it("tells the user the page was not found and links back home", () => {
		render(<NotFoundScreen />);

		expect(screen.getByText("notFound.title")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /nav.home/ })).toHaveAttribute(
			"href",
			"/",
		);
	});
});
