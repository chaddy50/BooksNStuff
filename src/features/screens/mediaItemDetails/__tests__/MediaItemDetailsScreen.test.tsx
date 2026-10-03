import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaItemDetailsScreen } from "#/features/screens/mediaItemDetails/MediaItemDetailsScreen";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => ({ id: 7 }),
	}),
	useNavigate: () => navigate,
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: (props: { right?: React.ReactNode }) => <div>{props.right}</div>,
}));

vi.mock(
	"#/features/screens/mediaItemDetails/components/metadata/Metadata",
	() => ({
		Metadata: () => null,
	}),
);

vi.mock(
	"#/features/screens/mediaItemDetails/components/relatedItems/RelatedItems",
	() => ({
		RelatedItems: () => null,
	}),
);

// Captures the contract the screen hands the guard, which is the unit under test
// here — History's own behavior is covered by its suite.
let isUnsavedChangesGuardEnabled: (() => boolean) | undefined;

vi.mock(
	"#/features/screens/mediaItemDetails/components/history/History",
	() => ({
		History: (props: { isUnsavedChangesGuardEnabled?: () => boolean }) => {
			isUnsavedChangesGuardEnabled = props.isUnsavedChangesGuardEnabled;
			return null;
		},
	}),
);

vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	removeFromLibrary: vi.fn(),
}));

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

function clickRemoveFromLibrary() {
	fireEvent.click(screen.getByText("mediaItemDetails.removeFromLibrary"));
}

afterEach(cleanup);
beforeEach(() => {
	vi.clearAllMocks();
	isUnsavedChangesGuardEnabled = undefined;
});

describe("MediaItemDetailsScreen", () => {
	it("leaves the guard enabled while the user is just viewing the item", () => {
		render(<MediaItemDetailsScreen />);

		expect(isUnsavedChangesGuardEnabled?.()).toBe(true);
	});

	// The server fn is keyed on the item now, not on a separate metadata row.
	it("removes by mediaItemId, never by metadataId", async () => {
		const { removeFromLibrary } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(removeFromLibrary).mockResolvedValue(undefined);
		render(<MediaItemDetailsScreen />);

		clickRemoveFromLibrary();

		expect(removeFromLibrary).toHaveBeenCalledWith({
			data: { mediaItemId: 7 },
		});
		const [payload] = vi.mocked(removeFromLibrary).mock.calls[0];
		expect(payload.data).not.toHaveProperty("metadataId");
	});

	it("disables the guard while the delete request is still in flight", async () => {
		const { removeFromLibrary } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		const pendingDelete = deferred<undefined>();
		vi.mocked(removeFromLibrary).mockReturnValue(pendingDelete.promise);
		render(<MediaItemDetailsScreen />);

		clickRemoveFromLibrary();

		expect(isUnsavedChangesGuardEnabled?.()).toBe(false);
		expect(navigate).not.toHaveBeenCalled();

		pendingDelete.resolve(undefined);
	});

	it("is still disabled by the time it navigates away", async () => {
		const { removeFromLibrary } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(removeFromLibrary).mockResolvedValue(undefined);
		let wasEnabledDuringNavigation: boolean | undefined;
		navigate.mockImplementation((options: { to: string }) => {
			wasEnabledDuringNavigation = isUnsavedChangesGuardEnabled?.();
			expect(options).toEqual({ to: "/" });
			return Promise.resolve();
		});
		render(<MediaItemDetailsScreen />);

		clickRemoveFromLibrary();

		await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
		expect(wasEnabledDuringNavigation).toBe(false);
	});

	it("re-enables the guard when the delete fails", async () => {
		const { removeFromLibrary } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(removeFromLibrary).mockRejectedValue(new Error("network down"));
		// The screen has no error handling of its own, so the click handler's
		// promise rejects with nothing awaiting it; that is out of scope here.
		const ignoreRejection = () => {};
		process.on("unhandledRejection", ignoreRejection);
		render(<MediaItemDetailsScreen />);

		clickRemoveFromLibrary();

		await vi.waitFor(() => expect(isUnsavedChangesGuardEnabled?.()).toBe(true));
		expect(navigate).not.toHaveBeenCalled();
		process.off("unhandledRejection", ignoreRejection);
	});
});
