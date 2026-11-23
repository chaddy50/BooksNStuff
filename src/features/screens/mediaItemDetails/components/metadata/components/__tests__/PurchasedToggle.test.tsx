import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PurchasedToggle } from "#/features/screens/mediaItemDetails/components/metadata/components/PurchasedToggle";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { PurchaseStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const invalidate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate }),
}));

vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	setPurchaseStatus: vi.fn().mockResolvedValue(undefined),
}));

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

const baseMediaItemDetails = {
	id: 1,
	purchaseStatus: PurchaseStatus.NOT_PURCHASED,
} as unknown as MediaItemDetails;

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("PurchasedToggle", () => {
	it("invalidates the router after a successful update", async () => {
		render(<PurchasedToggle mediaItemDetails={baseMediaItemDetails} />);

		fireEvent.click(screen.getByRole("combobox"));
		fireEvent.click(screen.getByText("purchaseStatus.purchased"));

		await vi.waitFor(() => expect(invalidate).toHaveBeenCalled());
		expect(toast).not.toHaveBeenCalled();
	});

	it("shows a destructive toast when setPurchaseStatus fails", async () => {
		const { setPurchaseStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(setPurchaseStatus).mockRejectedValueOnce(
			new Error("Network error"),
		);

		render(<PurchasedToggle mediaItemDetails={baseMediaItemDetails} />);

		fireEvent.click(screen.getByRole("combobox"));
		fireEvent.click(screen.getByText("purchaseStatus.purchased"));

		await vi.waitFor(() =>
			expect(toast).toHaveBeenCalledWith(
				"mediaItemDetails.purchaseStatusUpdateFailed",
				{ variant: "destructive" },
			),
		);
		expect(invalidate).not.toHaveBeenCalled();
	});
});
