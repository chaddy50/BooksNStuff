import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sheet, SheetContent } from "#/components/ui/sheet";

afterEach(cleanup);

function renderSheet(onOpenChange: (open: boolean) => void) {
	return render(
		<Sheet open onOpenChange={onOpenChange}>
			<SheetContent>
				<p>Sheet content</p>
			</SheetContent>
		</Sheet>,
	);
}

function dragHandle(deltaY: number) {
	const handle = document.querySelector('[data-slot="sheet-drag-handle"]');
	if (!handle) throw new Error("drag handle not found");
	fireEvent.pointerDown(handle, { clientY: 0, pointerId: 1 });
	fireEvent.pointerMove(handle, { clientY: deltaY, pointerId: 1 });
	fireEvent.pointerUp(handle, { clientY: deltaY, pointerId: 1 });
}

describe("SheetContent drag handle", () => {
	it("renders a drag handle at the top of the sheet", () => {
		renderSheet(vi.fn());

		expect(
			document.querySelector('[data-slot="sheet-drag-handle"]'),
		).not.toBeNull();
	});

	it("closes the sheet when dragged down past the dismiss threshold", () => {
		const onOpenChange = vi.fn();
		renderSheet(onOpenChange);

		dragHandle(150);

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("does not close the sheet when dragged only a little", () => {
		const onOpenChange = vi.fn();
		renderSheet(onOpenChange);

		dragHandle(20);

		expect(onOpenChange).not.toHaveBeenCalled();
	});
});
