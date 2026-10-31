import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { InsightsDateRange } from "#/features/screens/reports/types";
import {
	INSIGHTS_DATE_RANGE_PRESETS,
	type InsightsDateRangePresetKey,
} from "#/features/screens/reports/utils";
import { cn } from "#/lib/utils";

interface PresetListProps {
	selectedPreset: InsightsDateRangePresetKey | null;
	onSelect: (range: InsightsDateRange) => void;
}

export function PresetList({ selectedPreset, onSelect }: PresetListProps) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-1">
			{INSIGHTS_DATE_RANGE_PRESETS.map((preset) => (
				<PresetButton
					key={preset.key}
					label={t(`insights.dateRange.presets.${preset.key}`)}
					isSelected={selectedPreset === preset.key}
					onSelect={() => onSelect(preset.getRange())}
				/>
			))}
		</div>
	);
}

interface PresetButtonProps {
	label: string;
	isSelected: boolean;
	onSelect: () => void;
}

function PresetButton({ label, isSelected, onSelect }: PresetButtonProps) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
				isSelected && "bg-accent text-accent-foreground",
			)}
		>
			<PresetCheckmark isSelected={isSelected} />
			{label}
		</button>
	);
}

function PresetCheckmark({ isSelected }: { isSelected: boolean }) {
	return (
		<span className="size-4 shrink-0 flex items-center justify-center">
			{isSelected && <CheckIcon className="size-4" />}
		</span>
	);
}
