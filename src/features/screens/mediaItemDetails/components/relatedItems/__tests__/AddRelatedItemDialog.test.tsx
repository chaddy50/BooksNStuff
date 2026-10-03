import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import { MediaItemType } from "#/lib/enums";
import { AddRelatedItemDialog } from "../AddRelatedItemDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const invalidate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate }),
}));

const searchRelatedItemCandidates = vi.fn();
const addRelatedMediaItem = vi.fn().mockResolvedValue(undefined);
vi.mock("#/features/screens/mediaItemDetails/relatedItems", () => ({
	searchRelatedItemCandidates: (...args: unknown[]) =>
		searchRelatedItemCandidates(...args),
	addRelatedMediaItem: (...args: unknown[]) => addRelatedMediaItem(...args),
}));

const MEDIA_ITEM_ID = 1;

function renderDialog() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<AddRelatedItemDialog
					mediaItemId={MEDIA_ITEM_ID}
					isOpen
					onOpenChange={() => {}}
				/>
			</TooltipProvider>
		</QueryClientProvider>,
	);
}

async function typeQuery(query: string) {
	fireEvent.change(screen.getByRole("textbox"), { target: { value: query } });
	vi.advanceTimersByTime(400);
	await waitFor(() => expect(searchRelatedItemCandidates).toHaveBeenCalled());
}

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.useRealTimers();
});

describe("AddRelatedItemDialog", () => {
	it("prompts to type before searching", () => {
		renderDialog();

		expect(screen.getByText("search.prompt")).toBeInTheDocument();
		expect(searchRelatedItemCandidates).not.toHaveBeenCalled();
	});

	it("shows matching library items once the debounced search resolves", async () => {
		searchRelatedItemCandidates.mockResolvedValue([
			{
				id: 2,
				title: "Dune (1984 film)",
				type: MediaItemType.MOVIE,
				coverImageUrl: null,
			},
		]);
		renderDialog();

		await typeQuery("Dune");

		expect(await screen.findByText("Dune (1984 film)")).toBeInTheDocument();
		expect(searchRelatedItemCandidates).toHaveBeenCalledWith({
			data: { query: "Dune", excludeMediaItemId: MEDIA_ITEM_ID },
		});
	});

	it("shows a no-results message when nothing matches", async () => {
		searchRelatedItemCandidates.mockResolvedValue([]);
		renderDialog();

		await typeQuery("Zzz");

		expect(
			await screen.findByText("relatedItems.noResults"),
		).toBeInTheDocument();
	});

	it("adds the selected item and refreshes the page when a result is clicked", async () => {
		searchRelatedItemCandidates.mockResolvedValue([
			{
				id: 2,
				title: "Dune (1984 film)",
				type: MediaItemType.MOVIE,
				coverImageUrl: null,
			},
		]);
		renderDialog();
		await typeQuery("Dune");
		const result = await screen.findByText("Dune (1984 film)");

		fireEvent.click(result);

		await waitFor(() => {
			expect(addRelatedMediaItem).toHaveBeenCalledWith({
				data: { mediaItemId: MEDIA_ITEM_ID, relatedMediaItemId: 2 },
			});
			expect(invalidate).toHaveBeenCalled();
		});
	});
});
