import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackupSection } from "#/features/screens/settings/components/BackupSection";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/features/screens/settings/backup", () => ({
	exportBackup: vi.fn().mockResolvedValue({}),
	importBackup: vi.fn().mockResolvedValue(undefined),
}));

function setupFileReaderMock(content: string) {
	vi.spyOn(window, "FileReader").mockImplementation(() => {
		const reader: Partial<FileReader> = {
			readAsText: vi.fn().mockImplementation(() => {
				Promise.resolve().then(() => {
					reader.onload?.call(
						reader as FileReader,
						{
							target: { result: content },
						} as ProgressEvent<FileReader>,
					);
				});
			}),
		};
		return reader as FileReader;
	});
}

function renderBackupSection() {
	const queryClient = new QueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<BackupSection />
		</QueryClientProvider>,
	);
}

function triggerFileUpload(content: string) {
	setupFileReaderMock(content);
	const fileInput = document.querySelector(
		'input[type="file"]',
	) as HTMLInputElement;
	const file = new File([content], "backup.json", { type: "application/json" });
	Object.defineProperty(fileInput, "files", {
		value: [file],
		configurable: true,
	});
	fireEvent.change(fileInput);
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("BackupSection", () => {
	it("shows a parse error when the uploaded file contains invalid JSON", async () => {
		renderBackupSection();
		triggerFileUpload("not valid json {{{}");
		await waitFor(() => {
			expect(
				screen.getByText("settings.backup.parseError"),
			).toBeInTheDocument();
		});
	});

	it("shows the confirm dialog when the uploaded file contains valid JSON", async () => {
		renderBackupSection();
		triggerFileUpload(JSON.stringify({ version: 1, items: [] }));
		await waitFor(() => {
			expect(
				screen.getByText("settings.backup.confirmTitle"),
			).toBeInTheDocument();
		});
	});

	it("gives the confirm dialog a visible, accessible description", async () => {
		renderBackupSection();
		triggerFileUpload(JSON.stringify({ version: 1, items: [] }));
		await waitFor(() => {
			expect(
				screen.getByText("settings.backup.confirmTitle"),
			).toBeInTheDocument();
		});

		const description = screen.getByText("settings.backup.confirmDescription");
		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"settings.backup.confirmDescription",
		);
		expect(description).not.toHaveClass("sr-only");
	});
});
