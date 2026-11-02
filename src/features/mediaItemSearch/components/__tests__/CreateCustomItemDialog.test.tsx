import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateCustomItemDialog } from "#/features/mediaItemSearch/components/CreateCustomItemDialog";
import { MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
}));

vi.mock("#/features/mediaItemSearch/mediaItemSearch", () => ({
	createCustomItem: vi.fn(),
}));

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function fillRequiredFieldsAndSubmit() {
	fireEvent.change(screen.getByPlaceholderText("Title"), {
		target: { value: "Dune" },
	});
	fireEvent.click(screen.getByRole("combobox"));
	fireEvent.click(screen.getByText("mediaType.movie"));
	fireEvent.click(
		screen.getByRole("button", { name: "search.createCustomTitle" }),
	);
}

describe("CreateCustomItemDialog", () => {
	it("gives the dialog an accessible description", () => {
		render(<CreateCustomItemDialog isOpen onClose={vi.fn()} />);

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"search.createCustomDescription",
		);
	});

	it("navigates with an empty genre suggestion list after creating a custom item", async () => {
		const { createCustomItem } = await import(
			"#/features/mediaItemSearch/mediaItemSearch"
		);
		vi.mocked(createCustomItem).mockResolvedValue({ mediaItemId: 88 });

		render(
			<CreateCustomItemDialog
				isOpen
				onClose={vi.fn()}
				initialTitle="My Book"
				initialType={MediaItemType.BOOK}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "search.createCustomTitle" }),
		);

		await vi.waitFor(() =>
			expect(navigate).toHaveBeenCalledWith({
				to: "/mediaItemDetails/$mediaItemId",
				params: { mediaItemId: "88" },
				state: { genreSuggestions: [] },
			}),
		);
	});

	it("shows a destructive toast with the failure message and stays open when createCustomItem rejects", async () => {
		const { createCustomItem } = await import(
			"#/features/mediaItemSearch/mediaItemSearch"
		);
		vi.mocked(createCustomItem).mockRejectedValue(
			new Error("Title already exists."),
		);
		const onClose = vi.fn();

		render(<CreateCustomItemDialog isOpen onClose={onClose} />);

		fillRequiredFieldsAndSubmit();

		await waitFor(() =>
			expect(toast).toHaveBeenCalledWith("Title already exists.", {
				variant: "destructive",
			}),
		);
		expect(onClose).not.toHaveBeenCalled();
	});
});
