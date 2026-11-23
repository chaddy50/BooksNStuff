import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpectedReleaseDateInput } from "#/features/screens/mediaItemDetails/components/metadata/components/ExpectedReleaseDateInput";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const invalidate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate }),
}));

vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	setMediaItemExpectedReleaseDate: vi.fn().mockResolvedValue(undefined),
}));

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

const baseMediaItemDetails = {
	id: 1,
	status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	expectedReleaseDate: null,
} as unknown as MediaItemDetails;

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("ExpectedReleaseDateInput", () => {
	it("invalidates the router after a successful update", async () => {
		render(
			<ExpectedReleaseDateInput mediaItemDetails={baseMediaItemDetails} />,
		);

		fireEvent.change(screen.getByDisplayValue(""), {
			target: { value: "2024-05-15" },
		});

		await vi.waitFor(() => expect(invalidate).toHaveBeenCalled());
		expect(toast).not.toHaveBeenCalled();
	});

	it("shows a destructive toast when setMediaItemExpectedReleaseDate fails", async () => {
		const { setMediaItemExpectedReleaseDate } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(setMediaItemExpectedReleaseDate).mockRejectedValueOnce(
			new Error("Network error"),
		);

		render(
			<ExpectedReleaseDateInput mediaItemDetails={baseMediaItemDetails} />,
		);

		fireEvent.change(screen.getByDisplayValue(""), {
			target: { value: "2024-05-15" },
		});

		await vi.waitFor(() =>
			expect(toast).toHaveBeenCalledWith(
				"mediaItemDetails.expectedReleaseDateUpdateFailed",
				{ variant: "destructive" },
			),
		);
		expect(invalidate).not.toHaveBeenCalled();
	});
});
