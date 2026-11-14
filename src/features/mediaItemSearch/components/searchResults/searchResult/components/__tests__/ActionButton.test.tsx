import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#/components/ui/tooltip";
import { ActionButton } from "#/features/mediaItemSearch/components/searchResults/searchResult/components/ActionButton";
import type { SearchResultWithStatus } from "#/features/mediaItemSearch/types";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
}));

const toast = vi.fn();

vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

vi.mock("#/features/mediaItemSearch/mediaItemSearch", () => ({
	addToLibrary: vi.fn(),
}));

vi.mock("#/features/mediaItemSearch/components/PodcastArcPickerDialog", () => ({
	PodcastArcPickerDialog: () => null,
}));

const baseResult: SearchResultWithStatus = {
	externalId: "123",
	externalSource: "tmdb",
	type: MediaItemType.MOVIE,
	title: "Dune",
	metadata: {},
};

function renderActionButton(result: SearchResultWithStatus) {
	return render(
		<TooltipProvider>
			<ActionButton result={result} onClose={vi.fn()} />
		</TooltipProvider>,
	);
}

afterEach(cleanup);
afterEach(() => navigate.mockClear());
afterEach(() => toast.mockClear());

describe("ActionButton", () => {
	it("navigates with the result's suggested genres as router state", async () => {
		const { addToLibrary } = await import(
			"#/features/mediaItemSearch/mediaItemSearch"
		);
		vi.mocked(addToLibrary).mockResolvedValue({ mediaItemId: 55 });

		renderActionButton({
			...baseResult,
			metadata: { genres: ["Fantasy", "Mystery"] },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "search.addToLibrary" }),
		);

		await vi.waitFor(() =>
			expect(navigate).toHaveBeenCalledWith({
				to: "/mediaItemDetails/$mediaItemId",
				params: { mediaItemId: "55" },
				state: { genreSuggestions: ["Fantasy", "Mystery"] },
			}),
		);
	});

	it("navigates with an empty genre suggestion list when the result has none", async () => {
		const { addToLibrary } = await import(
			"#/features/mediaItemSearch/mediaItemSearch"
		);
		vi.mocked(addToLibrary).mockResolvedValue({ mediaItemId: 56 });

		renderActionButton(baseResult);
		fireEvent.click(
			screen.getByRole("button", { name: "search.addToLibrary" }),
		);

		await vi.waitFor(() =>
			expect(navigate).toHaveBeenCalledWith({
				to: "/mediaItemDetails/$mediaItemId",
				params: { mediaItemId: "56" },
				state: { genreSuggestions: [] },
			}),
		);
	});

	it("shows a destructive toast and stops showing the pending state when adding fails", async () => {
		const { addToLibrary } = await import(
			"#/features/mediaItemSearch/mediaItemSearch"
		);
		vi.mocked(addToLibrary).mockRejectedValue(new Error("Network error"));

		renderActionButton(baseResult);
		fireEvent.click(
			screen.getByRole("button", { name: "search.addToLibrary" }),
		);

		await vi.waitFor(() =>
			expect(toast).toHaveBeenCalledWith("search.addToLibraryError", {
				variant: "destructive",
			}),
		);
		expect(navigate).not.toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: "search.addToLibrary" }),
		).toBeInTheDocument();
	});

	it("shows StatusBadge when result is already in the library", () => {
		renderActionButton({
			...baseResult,
			mediaItemId: 42,
			status: MediaItemStatus.IN_PROGRESS,
		});
		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "search.addToLibrary" }),
		).not.toBeInTheDocument();
	});

	// Only MediaItemCard opts into the translucent variant.
	it("keeps solid status colors on the search result badge", () => {
		renderActionButton({
			...baseResult,
			mediaItemId: 42,
			status: MediaItemStatus.IN_PROGRESS,
		});

		const badge = screen.getByTestId("status-badge");
		expect(badge).toHaveClass("bg-blue-600");
		expect(badge).not.toHaveClass("bg-black/60");
	});

	it("shows Add to Library button when result is not in the library", () => {
		renderActionButton(baseResult);
		expect(
			screen.getByRole("button", { name: "search.addToLibrary" }),
		).toBeInTheDocument();
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	it("shows Add Arc button for podcast results regardless of library status", () => {
		renderActionButton({
			...baseResult,
			type: MediaItemType.PODCAST,
			mediaItemId: 99,
			status: MediaItemStatus.COMPLETED,
		});
		expect(
			screen.getByRole("button", { name: "podcast.addArc" }),
		).toBeInTheDocument();
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});
});
