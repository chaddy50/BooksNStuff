import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "#/lib/utils";

import { Input } from "./input";

export interface MultiSelectOption {
	value: string;
	label: string;
}

interface MultiSelectFilterProps {
	label: string;
	options: MultiSelectOption[];
	selectedValues: string[];
	onToggle: (value: string) => void;
	/**
	 * Shows an inline clear control inside the field once something is
	 * selected. Position the field's container with `relative` so the clear
	 * control overlays the trigger correctly.
	 */
	onClear?: () => void;
	clearAriaLabel?: string;
}

const itemOptionClasses =
	"flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground";

function filterOptionsByQuery(
	options: MultiSelectOption[],
	query: string,
): MultiSelectOption[] {
	if (!query) {
		return options;
	}
	return options.filter((option) =>
		option.label.toLowerCase().includes(query.toLowerCase()),
	);
}

function buildTriggerLabel(
	options: MultiSelectOption[],
	selectedValues: string[],
	fallbackLabel: string,
): string {
	const selectedLabels = options
		.filter((option) => selectedValues.includes(option.value))
		.map((option) => option.label);
	return selectedLabels.length > 0 ? selectedLabels.join(", ") : fallbackLabel;
}

export function MultiSelectFilter({
	label,
	options,
	selectedValues,
	onToggle,
	onClear,
	clearAriaLabel = "Clear",
}: MultiSelectFilterProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	const filteredOptions = filterOptionsByQuery(options, searchQuery);
	const hasSelection = selectedValues.length > 0;
	const showClear = hasSelection && onClear !== undefined;
	const triggerLabel = buildTriggerLabel(options, selectedValues, label);

	function handleOpenChange(open: boolean) {
		setIsOpen(open);
		if (!open) {
			setSearchQuery("");
		}
	}

	function handleClearClick(event: React.MouseEvent) {
		event.stopPropagation();
		onClear?.();
	}

	return (
		<>
			<PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
				<PopoverPrimitive.Trigger asChild>
					<button
						type="button"
						className={cn(
							"border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
							hasSelection && "border-primary",
							showClear && "pr-8",
						)}
					>
						<span
							className={cn(
								"truncate",
								!hasSelection && "text-muted-foreground",
							)}
						>
							{triggerLabel}
						</span>
						{!showClear && (
							<ChevronDownIcon className="size-4 shrink-0 opacity-50" />
						)}
					</button>
				</PopoverPrimitive.Trigger>
				<PopoverPrimitive.Portal>
					<PopoverPrimitive.Content
						align="start"
						sideOffset={4}
						onOpenAutoFocus={(e) => {
							e.preventDefault();
							inputRef.current?.focus();
						}}
						className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 w-(--radix-popover-trigger-width) overflow-hidden rounded-md border shadow-md"
					>
						<div className="border-b border-border p-1">
							<Input
								ref={inputRef}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search..."
								className="h-8 border-0 shadow-none focus-visible:ring-0"
							/>
						</div>
						<div
							className="max-h-56 overflow-y-auto overscroll-contain touch-pan-y p-1"
							onWheel={(e) => e.stopPropagation()}
							onTouchMove={(e) => e.stopPropagation()}
						>
							{filteredOptions.length === 0 && (
								<p className="px-2 py-1.5 text-sm text-muted-foreground">
									No results.
								</p>
							)}
							{filteredOptions.map((option) => {
								const isSelected = selectedValues.includes(option.value);
								return (
									<button
										key={option.value}
										type="button"
										onClick={() => onToggle(option.value)}
										className={cn(
											itemOptionClasses,
											isSelected && "bg-accent text-accent-foreground",
										)}
									>
										<span className="size-4 shrink-0 flex items-center justify-center">
											{isSelected && <CheckIcon className="size-4" />}
										</span>
										{option.label}
									</button>
								);
							})}
						</div>
					</PopoverPrimitive.Content>
				</PopoverPrimitive.Portal>
			</PopoverPrimitive.Root>
			{showClear && (
				<button
					type="button"
					aria-label={clearAriaLabel}
					onClick={handleClearClick}
					className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
				>
					<XIcon className="size-4" />
				</button>
			)}
		</>
	);
}
