import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateCustomItemDialog } from "#/features/mediaItemSearch/components/CreateCustomItemDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

vi.mock("#/features/mediaItemSearch/mediaItemSearch", () => ({
	createCustomItem: vi.fn(),
}));

afterEach(cleanup);

describe("CreateCustomItemDialog", () => {
	it("gives the dialog an accessible description", () => {
		render(<CreateCustomItemDialog isOpen onClose={vi.fn()} />);

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"search.createCustomDescription",
		);
	});
});
