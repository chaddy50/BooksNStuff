import { useBlocker } from "@tanstack/react-router";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInstanceEditorState } from "#/features/screens/mediaItemDetails/components/useInstanceEditorState";

vi.mock("@tanstack/react-router", () => ({
	useBlocker: vi.fn(),
}));

const mockedUseBlocker = useBlocker as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
	mockedUseBlocker.mockReturnValue({ status: "idle" });
});

describe("useInstanceEditorState", () => {
	it("opens Review & Complete immediately when nothing is editing", () => {
		const { result } = renderHook(() => useInstanceEditorState());

		result.current.openReviewAndComplete();

		expect(result.current.modalState).toBeNull();
	});

	it("exposes the requested modal state after opening it (re-rendered)", () => {
		const { result, rerender } = renderHook(() => useInstanceEditorState());

		result.current.openReviewAndComplete();
		rerender();

		expect(result.current.modalState).toEqual({ kind: "review-complete" });
	});

	it("opens edit-instance carrying the instance id", () => {
		const { result, rerender } = renderHook(() => useInstanceEditorState());

		result.current.openEditInstance(17);
		rerender();

		expect(result.current.modalState).toEqual({
			kind: "edit-instance",
			instanceId: 17,
		});
	});

	it("prompts instead of switching when the currently-open editor has unsaved changes", () => {
		const { result, rerender } = renderHook(() => useInstanceEditorState());
		result.current.openReviewAndComplete();
		rerender();
		result.current.editorRef.current = {
			hasUnsavedChanges: () => true,
			save: vi.fn().mockResolvedValue(true),
		};

		result.current.openEditInstance(5);
		rerender();

		expect(result.current.guard.isPrompting).toBe(true);
		expect(result.current.modalState).toEqual({ kind: "review-complete" });
	});

	it("closeModal resets modalState without prompting when there are no unsaved changes", () => {
		const { result, rerender } = renderHook(() => useInstanceEditorState());
		result.current.openReviewAndComplete();
		rerender();

		result.current.closeModal();
		rerender();

		expect(result.current.modalState).toBeNull();
		expect(result.current.guard.isPrompting).toBe(false);
	});
});
