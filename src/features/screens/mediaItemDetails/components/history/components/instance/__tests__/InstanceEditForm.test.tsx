import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { useUserSettings } from "#/components/hooks/useUserSettings";
import type { FictionRating } from "#/database/schema";
import {
	InstanceEditForm,
	type InstanceEditFormHandle,
} from "#/features/screens/mediaItemDetails/components/history/components/instance/InstanceEditForm";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";

type MockedUserSettings = ReturnType<typeof useUserSettings>;

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	saveInstance: vi.fn().mockResolvedValue(undefined),
	deleteInstance: vi.fn().mockResolvedValue(undefined),
	updateMediaItemStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("#/components/hooks/useUserSettings", () => ({
	useUserSettings: vi.fn(),
}));

const baseProps = {
	mediaItemId: 1,
	mediaItemType: MediaItemType.BOOK,
	status: MediaItemStatus.IN_PROGRESS,
	statusChangedAt: null,
	onSave: vi.fn(),
	onCancel: vi.fn(),
	onSeriesCompletionNeeded: vi.fn(),
};

const savedInstance = {
	id: 42,
	rating: 0,
	fictionRating: null,
	seasonReviews: null,
	consumptionInfo: null,
	reviewText: "First impressions",
	progressPercent: null,
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

	it("prefills the progress field from the instance's stored progressPercent", () => {
		render(
			<InstanceEditForm
				{...baseProps}
				instance={{
					id: 42,
					rating: 0,
					fictionRating: null,
					seasonReviews: null,
					consumptionInfo: null,
					reviewText: null,
					progressPercent: 55,
					startedAt: "2024-01-01",
					completedAt: null,
				}}
			/>,
		);

		expect(screen.getByLabelText("mediaItemDetails.progress")).toHaveValue(55);
	});

	it("saves the typed progress percentage", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		render(<InstanceEditForm {...baseProps} />);

		fireEvent.change(screen.getByLabelText("mediaItemDetails.progress"), {
			target: { value: "30" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		await vi.waitFor(() => expect(saveInstance).toHaveBeenCalled());
		expect(vi.mocked(saveInstance).mock.calls[0][0].data.progressPercent).toBe(
			"30.0000",
		);
	});

	it("sends an undefined progressPercent (clearing it server-side) when the field is emptied", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		render(
			<InstanceEditForm
				{...baseProps}
				instance={{
					id: 42,
					rating: 0,
					fictionRating: null,
					seasonReviews: null,
					consumptionInfo: null,
					reviewText: null,
					progressPercent: 55,
					startedAt: "2024-01-01",
					completedAt: null,
				}}
			/>,
		);

		fireEvent.change(screen.getByLabelText("mediaItemDetails.progress"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		await vi.waitFor(() => expect(saveInstance).toHaveBeenCalled());
		expect(
			vi.mocked(saveInstance).mock.calls[0][0].data.progressPercent,
		).toBeUndefined();
	});

	it("hides the progress field for an instance that already has a completed date", () => {
		render(
			<InstanceEditForm
				{...baseProps}
				instance={{
					id: 42,
					rating: 0,
					fictionRating: null,
					seasonReviews: null,
					consumptionInfo: null,
					reviewText: null,
					progressPercent: 100,
					startedAt: "2024-01-01",
					completedAt: "2024-01-15",
				}}
			/>,
		);

		expect(
			screen.queryByLabelText("mediaItemDetails.progress"),
		).not.toBeInTheDocument();
	});

	it("hides the progress field as soon as a completed date is typed in", () => {
		render(
			<InstanceEditForm
				{...baseProps}
				instance={{
					id: 42,
					rating: 0,
					fictionRating: null,
					seasonReviews: null,
					consumptionInfo: null,
					reviewText: null,
					progressPercent: 55,
					startedAt: "2024-01-01",
					completedAt: null,
				}}
			/>,
		);
		expect(
			screen.getByLabelText("mediaItemDetails.progress"),
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("mediaItemDetails.completed"), {
			target: { value: "2024-01-15" },
		});

		expect(
			screen.queryByLabelText("mediaItemDetails.progress"),
		).not.toBeInTheDocument();
	});

	it("shows the progress field again after the completed date is cleared", () => {
		render(
			<InstanceEditForm
				{...baseProps}
				instance={{
					id: 42,
					rating: 0,
					fictionRating: null,
					seasonReviews: null,
					consumptionInfo: null,
					reviewText: null,
					progressPercent: 100,
					startedAt: "2024-01-01",
					completedAt: "2024-01-15",
				}}
			/>,
		);

		fireEvent.change(screen.getByLabelText("mediaItemDetails.completed"), {
			target: { value: "" },
		});

		expect(
			screen.getByLabelText("mediaItemDetails.progress"),
		).toBeInTheDocument();
	});

	describe("page-based progress entry for books", () => {
		it("shows a page-number input with a total-pages suffix when pageCount is known", () => {
			render(
				<InstanceEditForm
					{...baseProps}
					pageCount={320}
					instance={{
						id: 42,
						rating: 0,
						fictionRating: null,
						seasonReviews: null,
						consumptionInfo: null,
						reviewText: null,
						progressPercent: 50,
						startedAt: "2024-01-01",
						completedAt: null,
					}}
				/>,
			);

			expect(screen.getByLabelText("mediaItemDetails.page")).toHaveValue(160);
			expect(screen.getByText("/ 320")).toBeInTheDocument();
		});

		it("saves the page number converted to a percent string", async () => {
			const { saveInstance } = await import(
				"#/features/screens/mediaItemDetails/mediaItemDetails"
			);
			vi.mocked(saveInstance).mockClear();
			render(<InstanceEditForm {...baseProps} pageCount={320} />);

			fireEvent.change(screen.getByLabelText("mediaItemDetails.page"), {
				target: { value: "160" },
			});
			fireEvent.click(screen.getByText("mediaItemDetails.save"));

			await vi.waitFor(() => expect(saveInstance).toHaveBeenCalled());
			expect(
				vi.mocked(saveInstance).mock.calls[0][0].data.progressPercent,
			).toBe("50.0000");
		});

		it("round-trips a page number through percent without drifting for large books", async () => {
			const { saveInstance } = await import(
				"#/features/screens/mediaItemDetails/mediaItemDetails"
			);
			vi.mocked(saveInstance).mockClear();
			render(<InstanceEditForm {...baseProps} pageCount={1200} />);

			fireEvent.change(screen.getByLabelText("mediaItemDetails.page"), {
				target: { value: "500" },
			});
			fireEvent.click(screen.getByText("mediaItemDetails.save"));

			await vi.waitFor(() => expect(saveInstance).toHaveBeenCalled());
			expect(
				vi.mocked(saveInstance).mock.calls[0][0].data.progressPercent,
			).toBe("41.6667");
		});

		it("shows the exact page number again after reopening, for a large book", () => {
			render(
				<InstanceEditForm
					{...baseProps}
					pageCount={1200}
					instance={{
						id: 42,
						rating: 0,
						fictionRating: null,
						seasonReviews: null,
						consumptionInfo: null,
						reviewText: null,
						progressPercent: 41.6667,
						startedAt: "2024-01-01",
						completedAt: null,
					}}
				/>,
			);

			expect(screen.getByLabelText("mediaItemDetails.page")).toHaveValue(500);
		});

		it("falls back to the raw percent field when pageCount is missing", () => {
			render(<InstanceEditForm {...baseProps} />);

			expect(
				screen.queryByLabelText("mediaItemDetails.page"),
			).not.toBeInTheDocument();
			expect(
				screen.getByLabelText("mediaItemDetails.progress"),
			).toBeInTheDocument();
		});

		it("falls back to the raw percent field for a non-book media type even with pageCount set", () => {
			render(
				<InstanceEditForm
					{...baseProps}
					mediaItemType={MediaItemType.MOVIE}
					pageCount={320}
				/>,
			);

			expect(
				screen.queryByLabelText("mediaItemDetails.page"),
			).not.toBeInTheDocument();
			expect(
				screen.getByLabelText("mediaItemDetails.progress"),
			).toBeInTheDocument();
		});

		it("clamps a page number above pageCount to 100 percent", async () => {
			const { saveInstance } = await import(
				"#/features/screens/mediaItemDetails/mediaItemDetails"
			);
			vi.mocked(saveInstance).mockClear();
			render(<InstanceEditForm {...baseProps} pageCount={320} />);

			fireEvent.change(screen.getByLabelText("mediaItemDetails.page"), {
				target: { value: "400" },
			});
			fireEvent.click(screen.getByText("mediaItemDetails.save"));

			await vi.waitFor(() => expect(saveInstance).toHaveBeenCalled());
			expect(
				vi.mocked(saveInstance).mock.calls[0][0].data.progressPercent,
			).toBe("100.0000");
		});

		it("clamps a negative page number to 0 percent", async () => {
			const { saveInstance } = await import(
				"#/features/screens/mediaItemDetails/mediaItemDetails"
			);
			vi.mocked(saveInstance).mockClear();
			render(<InstanceEditForm {...baseProps} pageCount={320} />);

			fireEvent.change(screen.getByLabelText("mediaItemDetails.page"), {
				target: { value: "-5" },
			});
			fireEvent.click(screen.getByText("mediaItemDetails.save"));

			await vi.waitFor(() => expect(saveInstance).toHaveBeenCalled());
			expect(
				vi.mocked(saveInstance).mock.calls[0][0].data.progressPercent,
			).toBe("0.0000");
		});

		it("sends an undefined progressPercent when the page-number field is emptied", async () => {
			const { saveInstance } = await import(
				"#/features/screens/mediaItemDetails/mediaItemDetails"
			);
			vi.mocked(saveInstance).mockClear();
			render(
				<InstanceEditForm
					{...baseProps}
					pageCount={320}
					instance={{
						id: 42,
						rating: 0,
						fictionRating: null,
						seasonReviews: null,
						consumptionInfo: null,
						reviewText: null,
						progressPercent: 50,
						startedAt: "2024-01-01",
						completedAt: null,
					}}
				/>,
			);

			fireEvent.change(screen.getByLabelText("mediaItemDetails.page"), {
				target: { value: "" },
			});
			fireEvent.click(screen.getByText("mediaItemDetails.save"));

			await vi.waitFor(() => expect(saveInstance).toHaveBeenCalled());
			expect(
				vi.mocked(saveInstance).mock.calls[0][0].data.progressPercent,
			).toBeUndefined();
		});
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
			progressPercent: null,
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
			progressPercent: null,
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

	it("shows the Set Other Status button only for an existing unfinished instance", () => {
		const { rerender } = render(<InstanceEditForm {...baseProps} />);
		expect(
			screen.queryByText("mediaItemDetails.setOtherStatus"),
		).not.toBeInTheDocument();

		rerender(<InstanceEditForm {...baseProps} instance={savedInstance} />);
		expect(
			screen.getByText("mediaItemDetails.setOtherStatus"),
		).toBeInTheDocument();

		rerender(
			<InstanceEditForm
				{...baseProps}
				instance={{ ...savedInstance, completedAt: "2024-01-15" }}
			/>,
		);
		expect(
			screen.queryByText("mediaItemDetails.setOtherStatus"),
		).not.toBeInTheDocument();
	});

	it("shows the same status/date summary as the header card when editing an existing instance", () => {
		render(<InstanceEditForm {...baseProps} instance={savedInstance} />);

		expect(screen.getByText("Started Jan 01, 2024")).toBeInTheDocument();
	});

	it("shows 'On Hold since' instead of the started date while on hold", () => {
		render(
			<InstanceEditForm
				{...baseProps}
				status={MediaItemStatus.ON_HOLD}
				statusChangedAt="2024-02-10"
				instance={savedInstance}
			/>,
		);

		expect(
			screen.getByText("mediaItemDetails.onHoldSince"),
		).toBeInTheDocument();
		expect(screen.queryByText("Started Jan 01, 2024")).not.toBeInTheDocument();
	});

	it("shows 'Dropped on' instead of the started date while dropped", () => {
		render(
			<InstanceEditForm
				{...baseProps}
				status={MediaItemStatus.DROPPED}
				statusChangedAt="2024-03-05"
				instance={savedInstance}
			/>,
		);

		expect(screen.getByText("mediaItemDetails.droppedOn")).toBeInTheDocument();
		expect(screen.queryByText("Started Jan 01, 2024")).not.toBeInTheDocument();
	});

	it("resumes an on-hold item by saving current fields then setting status to in_progress", async () => {
		const { saveInstance, updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		vi.mocked(updateMediaItemStatus).mockClear();
		const onSave = vi.fn();

		render(
			<InstanceEditForm
				{...baseProps}
				onSave={onSave}
				status={MediaItemStatus.ON_HOLD}
				statusChangedAt="2024-02-10"
				instance={savedInstance}
			/>,
		);
		expect(
			screen.queryByText("mediaItemDetails.setOtherStatus"),
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByText("mediaItemDetails.resume"));

		await vi.waitFor(() => expect(updateMediaItemStatus).toHaveBeenCalled());
		expect(saveInstance).toHaveBeenCalled();
		expect(updateMediaItemStatus).toHaveBeenCalledWith({
			data: { mediaItemId: baseProps.mediaItemId, status: "in_progress" },
		});
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it("resumes a dropped item by saving current fields then setting status to in_progress", async () => {
		const { saveInstance, updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		vi.mocked(updateMediaItemStatus).mockClear();
		const onSave = vi.fn();

		render(
			<InstanceEditForm
				{...baseProps}
				onSave={onSave}
				status={MediaItemStatus.DROPPED}
				statusChangedAt="2024-03-05"
				instance={savedInstance}
			/>,
		);
		expect(
			screen.queryByText("mediaItemDetails.setOtherStatus"),
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByText("mediaItemDetails.resume"));

		await vi.waitFor(() => expect(updateMediaItemStatus).toHaveBeenCalled());
		expect(saveInstance).toHaveBeenCalled();
		expect(updateMediaItemStatus).toHaveBeenCalledWith({
			data: { mediaItemId: baseProps.mediaItemId, status: "in_progress" },
		});
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it("does not show a status/date summary when creating a new instance", () => {
		render(<InstanceEditForm {...baseProps} />);

		expect(screen.queryByText("Started Jan 01, 2024")).not.toBeInTheDocument();
	});

	it("saves the current fields and sets the status to On Hold when confirmed", async () => {
		const { saveInstance, updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		vi.mocked(updateMediaItemStatus).mockClear();
		const onSave = vi.fn();

		render(
			<InstanceEditForm
				{...baseProps}
				onSave={onSave}
				instance={savedInstance}
			/>,
		);
		fireEvent.change(screen.getByLabelText("mediaItemDetails.review"), {
			target: { value: "Pausing here for now" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.setOtherStatus"));
		fireEvent.click(screen.getByText("status.on_hold"));

		await vi.waitFor(() => expect(updateMediaItemStatus).toHaveBeenCalled());
		expect(vi.mocked(saveInstance).mock.calls[0][0].data.reviewText).toBe(
			"Pausing here for now",
		);
		expect(updateMediaItemStatus).toHaveBeenCalledWith({
			data: { mediaItemId: baseProps.mediaItemId, status: "on_hold" },
		});
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it("saves the current fields and sets the status to Dropped when confirmed", async () => {
		const { saveInstance, updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		vi.mocked(updateMediaItemStatus).mockClear();
		const onSave = vi.fn();

		render(
			<InstanceEditForm
				{...baseProps}
				onSave={onSave}
				instance={savedInstance}
			/>,
		);
		fireEvent.click(screen.getByText("mediaItemDetails.setOtherStatus"));
		fireEvent.click(screen.getByText("status.dropped"));

		await vi.waitFor(() => expect(updateMediaItemStatus).toHaveBeenCalled());
		expect(updateMediaItemStatus).toHaveBeenCalledWith({
			data: { mediaItemId: baseProps.mediaItemId, status: "dropped" },
		});
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it("does not save or change status when the date range is invalid", async () => {
		const { saveInstance, updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockClear();
		vi.mocked(updateMediaItemStatus).mockClear();

		render(<InstanceEditForm {...baseProps} instance={savedInstance} />);
		fireEvent.change(screen.getByLabelText("mediaItemDetails.completed"), {
			target: { value: "2023-01-01" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.setOtherStatus"));
		fireEvent.click(screen.getByText("status.on_hold"));

		expect(saveInstance).not.toHaveBeenCalled();
		expect(updateMediaItemStatus).not.toHaveBeenCalled();
	});

	it("shows an error and does not close when setting the other status fails", async () => {
		const { updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(updateMediaItemStatus).mockRejectedValueOnce(
			new Error("network error"),
		);
		const onSave = vi.fn();

		render(
			<InstanceEditForm
				{...baseProps}
				onSave={onSave}
				instance={savedInstance}
			/>,
		);
		fireEvent.click(screen.getByText("mediaItemDetails.setOtherStatus"));
		fireEvent.click(screen.getByText("status.on_hold"));

		await vi.waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"mediaItemDetails.setOtherStatusFailed",
			),
		);
		expect(onSave).not.toHaveBeenCalled();
	});
});

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

	function stubBoundingRect(rect: { top: number; bottom: number }) {
		HTMLElement.prototype.getBoundingClientRect = vi
			.fn()
			.mockReturnValue({ ...rect, height: rect.bottom - rect.top } as DOMRect);
	}

	it("scrolls a new entry's form into view on mount when it's off-screen", () => {
		stubBoundingRect({ top: 2000, bottom: 2400 });

		render(<InstanceEditForm {...baseProps} />);

		expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
	});

	it("scrolls an existing entry's form into view on mount when it's off-screen", () => {
		stubBoundingRect({ top: -400, bottom: -100 });

		render(<InstanceEditForm {...baseProps} instance={savedInstance} />);

		expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
	});

	it("does not scroll when the form is already fully in view", () => {
		stubBoundingRect({ top: 100, bottom: 300 });

		render(<InstanceEditForm {...baseProps} instance={savedInstance} />);

		expect(scrollIntoView).not.toHaveBeenCalled();
	});

	it("calls onSeriesCompletionNeeded when saveInstance returns a confirmation", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		const confirmation = { seriesId: 7, seriesName: "Ongoing Trilogy" };
		vi.mocked(saveInstance).mockResolvedValueOnce(confirmation);
		const onSeriesCompletionNeeded = vi.fn();

		render(
			<InstanceEditForm
				{...baseProps}
				onSeriesCompletionNeeded={onSeriesCompletionNeeded}
			/>,
		);
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		await vi.waitFor(() => {
			expect(onSeriesCompletionNeeded).toHaveBeenCalledWith(confirmation);
		});
	});

	it("does not call onSeriesCompletionNeeded when saveInstance returns null", async () => {
		const { saveInstance } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(saveInstance).mockResolvedValueOnce(null);
		const onSave = vi.fn();
		const onSeriesCompletionNeeded = vi.fn();

		render(
			<InstanceEditForm
				{...baseProps}
				onSave={onSave}
				onSeriesCompletionNeeded={onSeriesCompletionNeeded}
			/>,
		);
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		await vi.waitFor(() => {
			expect(onSave).toHaveBeenCalled();
		});
		expect(onSeriesCompletionNeeded).not.toHaveBeenCalled();
	});
});
