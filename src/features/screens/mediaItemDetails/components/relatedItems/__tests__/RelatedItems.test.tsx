import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import { RelatedItems } from "../RelatedItems";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: { title?: string }) =>
			options?.title ? `${key} ${options.title}` : key,
	}),
}));

const invalidate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate }),
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const removeRelatedMediaItem = vi.fn().mockResolvedValue(undefined);
vi.mock("#/features/screens/mediaItemDetails/relatedItems", () => ({
	removeRelatedMediaItem: (...args: unknown[]) =>
		removeRelatedMediaItem(...args),
}));

vi.mock("../AddRelatedItemDialog", () => ({
	AddRelatedItemDialog: () => null,
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function buildMediaItemDetails(
	relatedItems: MediaItemDetails["relatedItems"],
): MediaItemDetails {
	return { id: 1, relatedItems } as unknown as MediaItemDetails;
}

function renderRelatedItems(relatedItems: MediaItemDetails["relatedItems"]) {
	return render(
		<TooltipProvider>
			<RelatedItems mediaItemDetails={buildMediaItemDetails(relatedItems)} />
		</TooltipProvider>,
	);
}

describe("RelatedItems", () => {
	it("shows the empty message when there are no related items", () => {
		renderRelatedItems([]);

		expect(screen.getByText("relatedItems.empty")).toBeInTheDocument();
	});

	it("renders a remove control for each related item", () => {
		renderRelatedItems([
			{
				id: 2,
				title: "Dune (1984 film)",
				type: MediaItemType.MOVIE,
				coverImageUrl: null,
				status: MediaItemStatus.BACKLOG,
				purchaseStatus: PurchaseStatus.NOT_PURCHASED,
				expectedReleaseDate: null,
				rating: 0,
			},
		]);

		expect(
			screen.getByLabelText("relatedItems.remove Dune (1984 film)"),
		).toBeInTheDocument();
		expect(screen.queryByText("relatedItems.empty")).not.toBeInTheDocument();
	});

	it("removes the item and refreshes the page when its remove control is clicked", async () => {
		renderRelatedItems([
			{
				id: 2,
				title: "Dune (1984 film)",
				type: MediaItemType.MOVIE,
				coverImageUrl: null,
				status: MediaItemStatus.BACKLOG,
				purchaseStatus: PurchaseStatus.NOT_PURCHASED,
				expectedReleaseDate: null,
				rating: 0,
			},
		]);

		fireEvent.click(
			screen.getByLabelText("relatedItems.remove Dune (1984 film)"),
		);

		await vi.waitFor(() => {
			expect(removeRelatedMediaItem).toHaveBeenCalledWith({
				data: { mediaItemId: 1, relatedMediaItemId: 2 },
			});
			expect(invalidate).toHaveBeenCalled();
		});
	});
});
