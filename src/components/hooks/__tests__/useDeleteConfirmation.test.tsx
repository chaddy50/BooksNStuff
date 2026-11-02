import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteConfirmation } from "#/components/hooks/useDeleteConfirmation";

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

beforeEach(() => {
	toast.mockClear();
});

describe("useDeleteConfirmation", () => {
	it("starts with the dialog closed", () => {
		const { result } = renderHook(() =>
			useDeleteConfirmation({
				onDelete: vi.fn(),
				failureMessage: "Couldn't delete this.",
			}),
		);

		expect(result.current.isDialogOpen).toBe(false);
		expect(result.current.isDeleting).toBe(false);
	});

	it("opens the dialog when a delete is requested", () => {
		const { result } = renderHook(() =>
			useDeleteConfirmation({
				onDelete: vi.fn(),
				failureMessage: "Couldn't delete this.",
			}),
		);

		act(() => result.current.requestDelete());

		expect(result.current.isDialogOpen).toBe(true);
	});

	it("closes the dialog without deleting when cancelled", () => {
		const onDelete = vi.fn();
		const { result } = renderHook(() =>
			useDeleteConfirmation({
				onDelete,
				failureMessage: "Couldn't delete this.",
			}),
		);

		act(() => result.current.requestDelete());
		act(() => result.current.cancelDelete());

		expect(result.current.isDialogOpen).toBe(false);
		expect(onDelete).not.toHaveBeenCalled();
	});

	it("calls onDelete when confirmed", async () => {
		const onDelete = vi.fn<() => Promise<void>>().mockResolvedValue();
		const { result } = renderHook(() =>
			useDeleteConfirmation({
				onDelete,
				failureMessage: "Couldn't delete this.",
			}),
		);

		await act(() => result.current.confirmDelete());

		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(result.current.isDeleting).toBe(false);
		expect(toast).not.toHaveBeenCalled();
	});

	it("shows a destructive toast with the failure message when onDelete rejects", async () => {
		const onDelete = vi.fn().mockRejectedValue(new Error("network down"));
		const { result } = renderHook(() =>
			useDeleteConfirmation({
				onDelete,
				failureMessage: "Couldn't delete this.",
			}),
		);

		act(() => result.current.requestDelete());
		await act(() => result.current.confirmDelete());

		expect(toast).toHaveBeenCalledWith("Couldn't delete this.", {
			variant: "destructive",
		});
		expect(result.current.isDeleting).toBe(false);
		expect(result.current.isDialogOpen).toBe(true);
	});
});
