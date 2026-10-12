import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { FilterAndSortOptions, ViewSubject } from "#/database/schema";
import { FilterAndSortActions } from "#/features/filterAndSort/components/FilterAndSortActions";
import { Filters } from "#/features/filterAndSort/components/Filters";
import { SortingOptions } from "#/features/filterAndSort/components/SortingOptions";
import { ViewName } from "#/features/filterAndSort/components/ViewName";
import { ViewSubjectChooser } from "#/features/filterAndSort/components/ViewSubject";
import { useFilterAndSortFormState } from "#/features/filterAndSort/useFilterAndSortFormState";
import { getGenres } from "#/lib/genres/genres";
import { getTags } from "#/lib/tags";

interface ViewFilterAndSortFormProps {
	initialName?: string;
	initialSubject?: ViewSubject;
	initialFilters?: FilterAndSortOptions;
	onSubmit: (data: {
		name: string;
		subject: ViewSubject;
		filters: FilterAndSortOptions;
	}) => Promise<void>;
	onCancel: () => void;
	onDelete?: () => Promise<void>;
}

export function ViewFilterAndSortForm({
	initialName = "",
	initialSubject = "items",
	initialFilters = {},
	onSubmit,
	onCancel,
	onDelete,
}: ViewFilterAndSortFormProps) {
	const [name, setName] = useState(initialName);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { data: tagsList = [] } = useQuery({
		queryKey: ["tags"],
		queryFn: () => getTags(),
	});
	const { data: genresList = [] } = useQuery({
		queryKey: ["genres"],
		queryFn: () => getGenres(),
	});
	const availableTags = tagsList.map((tag) => tag.name);
	const availableGenres = genresList.map((genre) => genre.name);
	const {
		subject,
		onSubjectChanged,
		filtersProps,
		sortingProps,
		buildFilters,
	} = useFilterAndSortFormState(
		initialSubject,
		initialFilters,
		availableTags,
		availableGenres,
	);

	async function handleSubmit() {
		setIsSubmitting(true);
		setError(null);
		try {
			await onSubmit({ name, subject, filters: buildFilters() });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save changes.");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleDelete() {
		if (!onDelete) return;
		setIsDeleting(true);
		setError(null);
		try {
			await onDelete();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete view.");
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<ViewName name={name} setName={setName} />
			<ViewSubjectChooser
				subject={subject}
				onSubjectChanged={onSubjectChanged}
			/>
			<Filters {...filtersProps} />
			<SortingOptions {...sortingProps} shouldAllowCustomOrder />
			{error && <p className="text-sm text-destructive">{error}</p>}
			<FilterAndSortActions
				onSubmit={handleSubmit}
				onCancel={onCancel}
				isSubmitting={isSubmitting}
				isSubmitDisabled={name.trim().length === 0}
				onDelete={onDelete ? handleDelete : undefined}
				isDeleting={isDeleting}
			/>
		</div>
	);
}
