import { CalendarIcon, CheckIcon } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import type { InsightsDateRange } from "#/features/screens/reports/types";
import {
	INSIGHTS_DATE_RANGE_PRESETS,
	matchPreset,
} from "#/features/screens/reports/utils";
import { cn, formatDateRange, getLocalDateString } from "#/lib/utils";

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
	const fromInputId = useId();
	const toInputId = useId();
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
					<div className="flex flex-col gap-1">
						{INSIGHTS_DATE_RANGE_PRESETS.map((preset) => (
							<button
								key={preset.key}
								type="button"
								onClick={() => handlePresetSelect(preset.getRange())}
								className={cn(
									"flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
									selectedPreset === preset.key &&
										"bg-accent text-accent-foreground",
								)}
							>
								<span className="size-4 shrink-0 flex items-center justify-center">
									{selectedPreset === preset.key && (
										<CheckIcon className="size-4" />
									)}
								</span>
								{t(`insights.dateRange.presets.${preset.key}`)}
							</button>
						))}
					</div>
					<div className="flex items-center gap-2 mt-3 border-t border-border pt-3">
						<div className="flex flex-col gap-1">
							<Label htmlFor={fromInputId}>{t("views.form.dateFrom")}</Label>
							<Input
								id={fromInputId}
								type="date"
								max={today}
								value={pendingStartDate}
								onChange={(e) => handleStartDateChange(e.target.value)}
							/>
						</div>
						<span className="text-muted-foreground mt-5">—</span>
						<div className="flex flex-col gap-1">
							<Label htmlFor={toInputId}>{t("views.form.dateTo")}</Label>
							<Input
								id={toInputId}
								type="date"
								max={today}
								value={pendingEndDate}
								onChange={(e) => handleEndDateChange(e.target.value)}
							/>
						</div>
					</div>
					<Button className="w-full mt-3" onClick={handleApply}>
						{t("insights.dateRange.apply")}
					</Button>
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}
