import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "#/components/ui/input";

interface ProgressFieldProps {
	completedAt: string;
	progressPercent: string;
	onProgressPercentChange: (value: string) => void;
}

/** Hidden once `completedAt` is set — a completed instance's progress is always 100%. */
export function ProgressField({
	completedAt,
	progressPercent,
	onProgressPercentChange,
}: ProgressFieldProps) {
	const { t } = useTranslation();
	const progressPercentId = useId();

	if (completedAt) return null;

	return (
		<div className="flex flex-col gap-1.5">
			<label
				className="text-sm text-muted-foreground"
				htmlFor={progressPercentId}
			>
				{t("mediaItemDetails.progress")}
			</label>
			<Input
				id={progressPercentId}
				type="number"
				min={0}
				max={100}
				value={progressPercent}
				onChange={(e) => onProgressPercentChange(e.target.value)}
				className="w-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
			/>
		</div>
	);
}
