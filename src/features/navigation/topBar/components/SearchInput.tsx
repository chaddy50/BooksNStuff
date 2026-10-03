import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "#/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";

interface SearchInputProps {
	value: string;
	navigateTo: string;
	params?: Record<string, string>;
}

export function SearchInput({ value, navigateTo, params }: SearchInputProps) {
	const navigate = useNavigate();
	const [localValue, setLocalValue] = useState(value);
	const [isHovered, setIsHovered] = useState(false);
	const [isFocused, setIsFocused] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "/") {
				const tag = (e.target as HTMLElement).tagName;
				if (tag !== "INPUT" && tag !== "TEXTAREA") {
					e.preventDefault();
					inputRef.current?.focus();
				}
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const newValue = event.target.value;
		setLocalValue(newValue);

		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		debounceRef.current = setTimeout(() => {
			void navigate({
				to: navigateTo,
				params: params as never,
				search: (prev: Record<string, unknown>) => ({
					...prev,
					titleQuery: newValue || undefined,
				}),
			});
		}, 400);
	}

	return (
		<Tooltip open={isHovered && !isFocused}>
			<TooltipTrigger asChild>
				<div className="relative flex-1 md:flex-initial">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
					<Input
						ref={inputRef}
						type="search"
						placeholder="Search..."
						value={localValue}
						onChange={handleChange}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
						onMouseEnter={() => setIsHovered(true)}
						onMouseLeave={() => setIsHovered(false)}
						className="pl-8 w-full md:w-48 max-md:h-11"
					/>
				</div>
			</TooltipTrigger>
			<TooltipContent>Press / to search</TooltipContent>
		</Tooltip>
	);
}
