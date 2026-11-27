import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "#/components/ui/input";

interface ProgressFieldProps {
	completedAt: string;
	progressPercent: string;
	onProgressPercentChange: (value: string) => void;
	pageCount?: number;
	/** Callers that autosave (rather than saving on a separate button) hook in here. */
	onBlur?: () => void;
}

/** Hidden once `completedAt` is set — a completed instance's progress is always 100%. */
export function ProgressField({
	completedAt,
	progressPercent,
	onProgressPercentChange,
	pageCount,
	onBlur,
}: ProgressFieldProps) {
	const { t } = useTranslation();
	const progressPercentId = useId();
	const isPageBasedProgress = Boolean(pageCount);

	if (completedAt) return null;

	return (
		<div className="flex items-center gap-1.5">
			<label
				className="text-sm text-muted-foreground"
				htmlFor={progressPercentId}
			>
				{t(
					isPageBasedProgress
						? "mediaItemDetails.page"
						: "mediaItemDetails.progress",
				)}
			</label>
			<Input
				id={progressPercentId}
				type="number"
				min={0}
				max={isPageBasedProgress ? pageCount : 100}
				value={progressPercent}
				onChange={(e) => onProgressPercentChange(e.target.value)}
				onBlur={onBlur}
				className="w-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
			/>
			<span className="text-sm text-muted-foreground">
				{isPageBasedProgress ? `/ ${pageCount}` : "%"}
			</span>
		</div>
	);
}
