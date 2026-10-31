import { useId } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";

interface CustomRangeInputsProps {
	startDate: string;
	endDate: string;
	max: string;
	onStartDateChange: (value: string) => void;
	onEndDateChange: (value: string) => void;
}

export function CustomRangeInputs({
	startDate,
	endDate,
	max,
	onStartDateChange,
	onEndDateChange,
}: CustomRangeInputsProps) {
	const { t } = useTranslation();
	const fromInputId = useId();
	const toInputId = useId();

	return (
		<div className="flex items-center gap-2 mt-3 border-t border-border pt-3">
			<DateField
				id={fromInputId}
				label={t("views.form.dateFrom")}
				value={startDate}
				max={max}
				onChange={onStartDateChange}
			/>
			<span className="text-muted-foreground mt-5">—</span>
			<DateField
				id={toInputId}
				label={t("views.form.dateTo")}
				value={endDate}
				max={max}
				onChange={onEndDateChange}
			/>
		</div>
	);
}

interface DateFieldProps {
	id: string;
	label: string;
	value: string;
	max: string;
	onChange: (value: string) => void;
}

function DateField({ id, label, value, max, onChange }: DateFieldProps) {
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				type="date"
				max={max}
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	);
}
