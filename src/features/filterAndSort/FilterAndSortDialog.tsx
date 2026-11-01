import { useTranslation } from "react-i18next";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type { FilterAndSortOptions, ViewSubject } from "#/database/schema";
import { FilterAndSortForm } from "./FilterAndSortForm";

interface FilterAndSortDialogProps {
	isOpen: boolean;
	onClose: () => void;
	initialFilters: FilterAndSortOptions;
	onApply: (filters: FilterAndSortOptions) => void;
	subject?: ViewSubject;
	title?: string;
}

export function FilterAndSortDialog({
	isOpen,
	onClose,
	initialFilters,
	onApply,
	subject = "items",
	title,
}: FilterAndSortDialogProps) {
	const { t } = useTranslation();

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{title ?? t("library.filterAndSort")}</DialogTitle>
					<DialogDescription className="sr-only">
						{t("library.filterAndSortDescription")}
					</DialogDescription>
				</DialogHeader>
				<FilterAndSortForm
					subject={subject}
					initialFilters={initialFilters}
					submitLabel={t("library.applyFilters")}
					onSubmit={async (filters) => {
						onApply(filters);
						onClose();
					}}
					onCancel={onClose}
				/>
			</DialogContent>
		</Dialog>
	);
}
