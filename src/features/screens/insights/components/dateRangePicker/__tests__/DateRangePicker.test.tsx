import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "#/features/screens/insights/components/dateRangePicker/DateRangePicker";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const labels: Record<string, string> = {
				"insights.dateRange.presets.thisMonth": "This month",
				"insights.dateRange.presets.lastMonth": "Last month",
				"insights.dateRange.presets.last3Months": "Last 3 months",
				"insights.dateRange.presets.last6Months": "Last 6 months",
				"insights.dateRange.presets.last12Months": "Last 12 months",
				"insights.dateRange.presets.yearToDate": "Year to date",
				"insights.dateRange.apply": "Apply",
				"insights.dateRange.label": "Date range",
				"views.form.dateFrom": "From",
				"views.form.dateTo": "To",
			};
			return labels[key] ?? key;
		},
	}),
}));

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

// A range that matches no preset, used whenever a test just needs to open
// the popover without the trigger label itself being under test.
const CUSTOM_RANGE = { startDate: "2024-03-01", endDate: "2024-03-10" };

function openPicker() {
	fireEvent.click(screen.getByRole("button", { name: /Mar 01, 2024/ }));
}

describe("DateRangePicker", () => {
	it("shows the formatted range on the trigger for a range matching no preset", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		render(<DateRangePicker {...CUSTOM_RANGE} onApply={vi.fn()} />);

		expect(
			screen.getByRole("button", { name: /Mar 01, 2024.*Mar 10, 2024/ }),
		).toBeInTheDocument();
	});

	it("shows the preset label on the trigger when the range matches a preset", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		render(
			<DateRangePicker
				startDate="2026-01-01"
				endDate="2026-10-31"
				onApply={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Year to date" }),
		).toBeInTheDocument();
	});

	it("highlights Year to date as the active preset by default", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		render(
			<DateRangePicker
				startDate="2026-01-01"
				endDate="2026-10-31"
				onApply={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Year to date" }));

		expect(
			screen.getAllByRole("button", { name: "Year to date" })[1],
		).toHaveClass("bg-accent");
	});

	it("applies a preset's computed range when clicked and Apply is pressed", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		const onApply = vi.fn();
		render(<DateRangePicker {...CUSTOM_RANGE} onApply={onApply} />);

		openPicker();
		fireEvent.click(screen.getByRole("button", { name: "Last 3 months" }));
		fireEvent.click(screen.getByRole("button", { name: "Apply" }));

		expect(onApply).toHaveBeenCalledWith({
			startDate: "2026-07-31",
			endDate: "2026-10-31",
		});
	});

	it("applies a custom edited range and clears the preset highlight", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		const onApply = vi.fn();
		render(
			<DateRangePicker
				startDate="2026-01-01"
				endDate="2026-10-31"
				onApply={onApply}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Year to date" }));
		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2025-06-01" },
		});
		fireEvent.change(screen.getByLabelText("To"), {
			target: { value: "2025-06-30" },
		});

		expect(
			screen.getAllByRole("button", { name: "Year to date" })[1],
		).not.toHaveClass("bg-accent");

		fireEvent.click(screen.getByRole("button", { name: "Apply" }));

		expect(onApply).toHaveBeenCalledWith({
			startDate: "2025-06-01",
			endDate: "2025-06-30",
		});
	});

	it("clamps the 'from' field to the 'to' field when 'to' is moved earlier", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		const onApply = vi.fn();
		render(<DateRangePicker {...CUSTOM_RANGE} onApply={onApply} />);

		openPicker();
		fireEvent.change(screen.getByLabelText("To"), {
			target: { value: "2024-01-01" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Apply" }));

		expect(onApply).toHaveBeenCalledWith({
			startDate: "2024-01-01",
			endDate: "2024-01-01",
		});
	});

	it("does not allow a future date in either input", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		render(<DateRangePicker {...CUSTOM_RANGE} onApply={vi.fn()} />);

		openPicker();

		expect(screen.getByLabelText("From")).toHaveAttribute("max", "2026-10-31");
		expect(screen.getByLabelText("To")).toHaveAttribute("max", "2026-10-31");
	});

	it("re-initializes pending state from the latest props when reopened", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		const onApply = vi.fn();
		const { rerender } = render(
			<DateRangePicker {...CUSTOM_RANGE} onApply={onApply} />,
		);

		openPicker();
		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2025-06-01" },
		});
		fireEvent.keyDown(screen.getByLabelText("From"), { key: "Escape" });

		rerender(
			<DateRangePicker
				startDate="2025-01-01"
				endDate="2025-01-15"
				onApply={onApply}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: /Jan 01, 2025.*Jan 15, 2025/ }),
		);

		expect(screen.getByLabelText("From")).toHaveValue("2025-01-01");
	});
});
