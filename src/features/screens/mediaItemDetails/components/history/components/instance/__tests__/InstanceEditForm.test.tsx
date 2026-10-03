import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { useUserSettings } from "#/components/hooks/useUserSettings";
import type { FictionRating } from "#/database/schema";
import {
	InstanceEditForm,
	type InstanceEditFormHandle,
} from "#/features/screens/mediaItemDetails/components/history/components/instance/InstanceEditForm";
import { MediaItemType } from "#/lib/enums";

type MockedUserSettings = ReturnType<typeof useUserSettings>;

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	saveInstance: vi.fn().mockResolvedValue(undefined),
	deleteInstance: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("#/components/hooks/useUserSettings", () => ({
	useUserSettings: vi.fn(),
}));

const baseProps = {
	mediaItemId: 1,
	mediaItemType: MediaItemType.BOOK,
	onSave: vi.fn(),
	onCancel: vi.fn(),
};

afterEach(cleanup);
beforeEach(async () => {
	const { useUserSettings } = await import(
		"#/components/hooks/useUserSettings"
	);
	vi.mocked(useUserSettings).mockReturnValue({
		data: undefined,
	} as unknown as MockedUserSettings);
});

describe("InstanceEditForm", () => {
	it("shows a date error and does not submit when completedAt is before startedAt", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		render(<InstanceEditForm {...baseProps} />);

		fireEvent.change(screen.getByLabelText("mediaItemDetails.started"), {
			target: { value: "2024-06-01" },
		});
		fireEvent.change(screen.getByLabelText("mediaItemDetails.completed"), {
			target: { value: "2024-01-01" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		expect(screen.getByTestId("date-error")).toBeInTheDocument();
		expect(saveInstance).not.toHaveBeenCalled();
	});

	it("submits with no dates without showing an error", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		render(<InstanceEditForm {...baseProps} instance={undefined} />);

		// Clear the default startedAt that the form pre-fills for new instances
		fireEvent.change(screen.getByLabelText("mediaItemDetails.started"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		expect(screen.queryByTestId("date-error")).not.toBeInTheDocument();
		expect(saveInstance).toHaveBeenCalled();
	});

	it("shows season reviews section only when mediaItemType is TV_SHOW", () => {
		const { rerender } = render(
			<InstanceEditForm {...baseProps} mediaItemType={MediaItemType.BOOK} />,
		);
		expect(
			screen.queryByText("mediaItemDetails.seasonReviews"),
		).not.toBeInTheDocument();

		rerender(
			<InstanceEditForm {...baseProps} mediaItemType={MediaItemType.TV_SHOW} />,
		);
		expect(
			screen.getByText("mediaItemDetails.seasonReviews"),
		).toBeInTheDocument();
	});

	it("uses settings default consumption method for existing instance with no consumptionInfo", async () => {
		const { useUserSettings } = await import(
			"#/components/hooks/useUserSettings"
		);
		vi.mocked(useUserSettings).mockReturnValue({
			data: { defaultBookConsumptionMethod: "audiobook" },
		} as unknown as MockedUserSettings);

		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();

		const instance = {
			id: 42,
			rating: 0,
			fictionRating: null,
			seasonReviews: null,
			consumptionInfo: null,
			reviewText: null,
			startedAt: null,
			completedAt: null,
		};

		render(
			<InstanceEditForm
				{...baseProps}
				mediaItemType={MediaItemType.BOOK}
				instance={instance}
			/>,
		);

		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		await vi.waitFor(() => expect(saveInstance).toHaveBeenCalled());
		const callData = vi.mocked(saveInstance).mock.calls[0][0].data;
		expect(callData.consumptionInfo).toMatchObject({ method: "audiobook" });
	});

	it("renders the review field large enough to write in", () => {
		render(<InstanceEditForm {...baseProps} />);

		const reviewField = screen.getByLabelText("mediaItemDetails.review");
		expect(reviewField).toHaveAttribute("rows", "6");
	});

	it("renders the review field as auto-resizing rather than hand-draggable", () => {
		render(<InstanceEditForm {...baseProps} />);

		expect(screen.getByLabelText("mediaItemDetails.review")).toHaveClass(
			"resize-none",
			"field-sizing-fixed",
		);
	});

	it("saves the text typed into the review field", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		render(<InstanceEditForm {...baseProps} />);

		fireEvent.change(screen.getByLabelText("mediaItemDetails.review"), {
			target: { value: "A great read" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		await vi.waitFor(() => expect(saveInstance).toHaveBeenCalled());
		expect(vi.mocked(saveInstance).mock.calls[0][0].data.reviewText).toBe(
			"A great read",
		);
	});

	it("saves an untouched review field as undefined", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		render(<InstanceEditForm {...baseProps} />);

		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		await vi.waitFor(() => expect(saveInstance).toHaveBeenCalled());
		expect(
			vi.mocked(saveInstance).mock.calls[0][0].data.reviewText,
		).toBeUndefined();
	});

	it("shows delete button only when an existing instance is provided", () => {
		const instance = {
			id: 42,
			rating: 0,
			fictionRating: null,
			seasonReviews: null,
			consumptionInfo: null,
			reviewText: null,
			startedAt: null,
			completedAt: null,
		};

		const { rerender } = render(<InstanceEditForm {...baseProps} />);
		expect(
			screen.queryByText("mediaItemDetails.removeEntry"),
		).not.toBeInTheDocument();

		rerender(<InstanceEditForm {...baseProps} instance={instance} />);
		expect(
			screen.getByText("mediaItemDetails.removeEntry"),
		).toBeInTheDocument();
	});
});

const savedInstance = {
	id: 42,
	rating: 0,
	fictionRating: null,
	seasonReviews: null,
	consumptionInfo: null,
	reviewText: "First impressions",
	startedAt: "2024-01-01",
	completedAt: null,
};

function fictionRating(): FictionRating {
	return {
		setting: { rating: 4 },
		character: { rating: 4 },
		plot: { rating: 4 },
		enjoyment: { rating: 4 },
		depth: { rating: 4 },
	};
}

describe("InstanceEditForm unsaved changes", () => {
	it("reports a freshly opened new entry as clean despite the pre-filled start date", () => {
		const handleRef = createRef<InstanceEditFormHandle>();

		render(<InstanceEditForm {...baseProps} ref={handleRef} />);

		expect(handleRef.current?.hasUnsavedChanges()).toBe(false);
	});

	it("reports a freshly opened existing entry as clean", () => {
		const handleRef = createRef<InstanceEditFormHandle>();

		render(
			<InstanceEditForm
				{...baseProps}
				instance={savedInstance}
				ref={handleRef}
			/>,
		);

		expect(handleRef.current?.hasUnsavedChanges()).toBe(false);
	});

	it("stays clean when user settings fill in the default consumption method", async () => {
		const { useUserSettings } = await import(
			"#/components/hooks/useUserSettings"
		);
		const handleRef = createRef<InstanceEditFormHandle>();

		const { rerender } = render(
			<InstanceEditForm {...baseProps} ref={handleRef} />,
		);

		vi.mocked(useUserSettings).mockReturnValue({
			data: { defaultBookConsumptionMethod: "audiobook" },
		} as unknown as MockedUserSettings);
		rerender(<InstanceEditForm {...baseProps} ref={handleRef} />);

		expect(handleRef.current?.hasUnsavedChanges()).toBe(false);
	});

	it("becomes dirty once the review text is edited", () => {
		const handleRef = createRef<InstanceEditFormHandle>();

		render(
			<InstanceEditForm
				{...baseProps}
				instance={savedInstance}
				ref={handleRef}
			/>,
		);
		fireEvent.change(screen.getByLabelText("mediaItemDetails.review"), {
			target: { value: "Changed my mind" },
		});

		expect(handleRef.current?.hasUnsavedChanges()).toBe(true);
	});

	it("becomes dirty once a date is edited", () => {
		const handleRef = createRef<InstanceEditFormHandle>();

		render(
			<InstanceEditForm
				{...baseProps}
				instance={savedInstance}
				ref={handleRef}
			/>,
		);
		fireEvent.change(screen.getByLabelText("mediaItemDetails.started"), {
			target: { value: "2024-03-03" },
		});

		expect(handleRef.current?.hasUnsavedChanges()).toBe(true);
	});

	it("becomes clean again when an edit is reverted", () => {
		const handleRef = createRef<InstanceEditFormHandle>();

		render(
			<InstanceEditForm
				{...baseProps}
				instance={savedInstance}
				ref={handleRef}
			/>,
		);
		const reviewField = screen.getByLabelText("mediaItemDetails.review");

		fireEvent.change(reviewField, { target: { value: "Changed my mind" } });
		expect(handleRef.current?.hasUnsavedChanges()).toBe(true);

		fireEvent.change(reviewField, { target: { value: "First impressions" } });
		expect(handleRef.current?.hasUnsavedChanges()).toBe(false);
	});

	it("becomes dirty once a season review is added", () => {
		const handleRef = createRef<InstanceEditFormHandle>();

		render(
			<InstanceEditForm
				{...baseProps}
				mediaItemType={MediaItemType.TV_SHOW}
				instance={savedInstance}
				ref={handleRef}
			/>,
		);
		fireEvent.click(screen.getByText("mediaItemDetails.addSeasonReview"));

		expect(handleRef.current?.hasUnsavedChanges()).toBe(true);
	});

	it("refuses to save and skips the server when the date range is invalid", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		const handleRef = createRef<InstanceEditFormHandle>();

		render(<InstanceEditForm {...baseProps} ref={handleRef} />);
		fireEvent.change(screen.getByLabelText("mediaItemDetails.started"), {
			target: { value: "2024-06-01" },
		});
		fireEvent.change(screen.getByLabelText("mediaItemDetails.completed"), {
			target: { value: "2024-01-01" },
		});

		await expect(handleRef.current?.save()).resolves.toBe(false);
		expect(saveInstance).not.toHaveBeenCalled();
		expect(screen.getByTestId("date-error")).toBeInTheDocument();
	});

	it("saves through the handle and reports success", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		const handleRef = createRef<InstanceEditFormHandle>();

		render(
			<InstanceEditForm
				{...baseProps}
				instance={savedInstance}
				ref={handleRef}
			/>,
		);
		fireEvent.change(screen.getByLabelText("mediaItemDetails.review"), {
			target: { value: "Changed my mind" },
		});

		await expect(handleRef.current?.save()).resolves.toBe(true);
		expect(saveInstance).toHaveBeenCalledTimes(1);
		expect(vi.mocked(saveInstance).mock.calls[0][0].data.reviewText).toBe(
			"Changed my mind",
		);
	});

	it("is clean again after a successful save", async () => {
		const handleRef = createRef<InstanceEditFormHandle>();

		render(
			<InstanceEditForm
				{...baseProps}
				instance={savedInstance}
				ref={handleRef}
			/>,
		);
		fireEvent.change(screen.getByLabelText("mediaItemDetails.review"), {
			target: { value: "Changed my mind" },
		});
		await handleRef.current?.save();

		expect(handleRef.current?.hasUnsavedChanges()).toBe(false);
	});

	it("is clean again after removing the detailed rating saves immediately", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		const handleRef = createRef<InstanceEditFormHandle>();

		render(
			<InstanceEditForm
				{...baseProps}
				instance={{
					...savedInstance,
					rating: 4,
					fictionRating: fictionRating(),
				}}
				ref={handleRef}
			/>,
		);
		fireEvent.click(screen.getByText("mediaItemDetails.removeDetailedRating"));

		await vi.waitFor(() => expect(saveInstance).toHaveBeenCalledTimes(1));
		expect(handleRef.current?.hasUnsavedChanges()).toBe(false);
	});
});

describe("InstanceEditForm scrolling into view", () => {
	// jsdom doesn't implement scrollIntoView at all, so there's nothing to spy
	// on — the test provides its own stub, same as it would in a real browser.
	let scrollIntoView: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		scrollIntoView = vi.fn();
		HTMLElement.prototype.scrollIntoView = scrollIntoView;
	});

	it("scrolls itself into view on mount when creating a new entry", () => {
		render(<InstanceEditForm {...baseProps} />);

		expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
	});

	it("does not scroll on mount when editing an existing entry", () => {
		render(<InstanceEditForm {...baseProps} instance={savedInstance} />);

		expect(scrollIntoView).not.toHaveBeenCalled();
	});
});
