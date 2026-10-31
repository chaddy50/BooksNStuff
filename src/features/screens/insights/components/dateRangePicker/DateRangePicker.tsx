import { CalendarIcon } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import type { InsightsDateRange } from "#/features/screens/reports/types";
import { matchPreset } from "#/features/screens/reports/utils";
import { formatDateRange, getLocalDateString } from "#/lib/utils";
import { CustomRangeInputs } from "./components/CustomRangeInputs";
import { PresetList } from "./components/PresetList";

interface DateRangePickerProps {
	startDate: string;
	endDate: string;
	onApply: (range: InsightsDateRange) => void;
}

export function DateRangePicker({
	startDate,
	endDate,
	onApply,
}: DateRangePickerProps) {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const [pendingStartDate, setPendingStartDate] = useState(startDate);
	const [pendingEndDate, setPendingEndDate] = useState(endDate);
	const today = getLocalDateString(new Date());
	const selectedPreset = matchPreset({
		startDate: pendingStartDate,
		endDate: pendingEndDate,
	});
	const activePreset = matchPreset({ startDate, endDate });
	const triggerLabel = activePreset
		? t(`insights.dateRange.presets.${activePreset}`)
		: formatDateRange(startDate, endDate);

	function handleOpenChange(open: boolean) {
		setIsOpen(open);
		if (open) {
			setPendingStartDate(startDate);
			setPendingEndDate(endDate);
		}
	}

	function handlePresetSelect(range: InsightsDateRange) {
		setPendingStartDate(range.startDate);
		setPendingEndDate(range.endDate);
	}

	function handleStartDateChange(value: string) {
		setPendingStartDate(value);
		if (value > pendingEndDate) {
			setPendingEndDate(value);
		}
	}

	function handleEndDateChange(value: string) {
		setPendingEndDate(value);
		if (value < pendingStartDate) {
			setPendingStartDate(value);
		}
	}

	function handleApply() {
		onApply({ startDate: pendingStartDate, endDate: pendingEndDate });
		setIsOpen(false);
	}

	return (
		<PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
			<PopoverPrimitive.Trigger asChild>
				<Button variant="outline">
					<CalendarIcon className="size-4" />
					{triggerLabel}
				</Button>
			</PopoverPrimitive.Trigger>
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					align="end"
					sideOffset={4}
					className="bg-popover text-popover-foreground z-50 w-72 rounded-md border p-3 shadow-md"
				>
					<span className="sr-only">{t("insights.dateRange.label")}</span>
					<PresetList
						selectedPreset={selectedPreset}
						onSelect={handlePresetSelect}
					/>
					<CustomRangeInputs
						startDate={pendingStartDate}
						endDate={pendingEndDate}
						max={today}
						onStartDateChange={handleStartDateChange}
						onEndDateChange={handleEndDateChange}
					/>
					<Button className="w-full mt-3" onClick={handleApply}>
						{t("insights.dateRange.apply")}
					</Button>
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}
