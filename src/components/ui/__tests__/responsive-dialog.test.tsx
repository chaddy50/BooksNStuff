import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ResponsiveDialog,
	ResponsiveDialogBody,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
} from "#/components/ui/responsive-dialog";

let isMobile = false;

vi.mock("#/components/hooks/useIsMobile", () => ({
	useIsMobile: () => isMobile,
}));

afterEach(() => {
	cleanup();
	isMobile = false;
});

describe("ResponsiveDialog", () => {
	it("renders dialog content, not sheet content, at a desktop viewport", () => {
		isMobile = false;

		render(
			<ResponsiveDialog open onOpenChange={() => undefined}>
				Content
			</ResponsiveDialog>,
		);

		expect(
			screen.getByText("Content").closest("[data-slot='dialog-content']"),
		).not.toBeNull();
		expect(document.querySelector("[data-slot='sheet-content']")).toBeNull();
	});

	it("renders sheet content, not dialog content, at a mobile viewport", () => {
		isMobile = true;

		render(
			<ResponsiveDialog open onOpenChange={() => undefined}>
				Content
			</ResponsiveDialog>,
		);

		expect(
			screen.getByText("Content").closest("[data-slot='sheet-content']"),
		).not.toBeNull();
		expect(document.querySelector("[data-slot='dialog-content']")).toBeNull();
	});

	it("never renders both a dialog and a sheet at once", () => {
		isMobile = true;

		render(
			<ResponsiveDialog open onOpenChange={() => undefined}>
				Content
			</ResponsiveDialog>,
		);

		expect(document.querySelectorAll("[role='dialog']").length).toBe(1);
	});

	it("gives the dialog an accessible description via ResponsiveDialogDescription", () => {
		render(
			<ResponsiveDialog open onOpenChange={() => undefined}>
				<ResponsiveDialogDescription>
					Extra detail for screen readers
				</ResponsiveDialogDescription>
			</ResponsiveDialog>,
		);

		expect(screen.getByText("Extra detail for screen readers")).toHaveAttribute(
			"data-slot",
			"dialog-description",
		);
		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"Extra detail for screen readers",
		);
	});

	it("pads the body to match the sheet's header inset at a mobile viewport", () => {
		isMobile = true;

		render(
			<ResponsiveDialog open onOpenChange={() => undefined}>
				<ResponsiveDialogBody>Body content</ResponsiveDialogBody>
			</ResponsiveDialog>,
		);

		expect(screen.getByText("Body content")).toHaveClass("px-6", "py-4");
	});

	it("does not pad the body at a desktop viewport, since DialogContent already pads itself", () => {
		isMobile = false;

		render(
			<ResponsiveDialog open onOpenChange={() => undefined}>
				<ResponsiveDialogBody>Body content</ResponsiveDialogBody>
			</ResponsiveDialog>,
		);

		expect(screen.getByText("Body content")).not.toHaveClass("px-6", "py-4");
	});

	it("never shows the close X on mobile, even when showCloseButton is left at its default", () => {
		isMobile = true;

		render(
			<ResponsiveDialog open onOpenChange={() => undefined}>
				Content
			</ResponsiveDialog>,
		);

		expect(screen.queryByText("Close")).not.toBeInTheDocument();
	});

	it("still shows the close X on desktop by default", () => {
		isMobile = false;

		render(
			<ResponsiveDialog open onOpenChange={() => undefined}>
				Content
			</ResponsiveDialog>,
		);

		expect(screen.getByText("Close")).toBeInTheDocument();
	});

	it("gives the footer a top border and matching inset at a mobile viewport", () => {
		isMobile = true;

		render(
			<ResponsiveDialog open onOpenChange={() => undefined}>
				<ResponsiveDialogFooter>Footer content</ResponsiveDialogFooter>
			</ResponsiveDialog>,
		);

		expect(screen.getByText("Footer content")).toHaveClass("px-6", "border-t");
	});
});
