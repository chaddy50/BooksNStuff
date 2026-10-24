import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { getTags } from "#/lib/tags";
import { cn } from "#/lib/utils";

interface TagsEditorProps {
	pendingTags: string[];
	onPendingTagsChange: (tags: string[]) => void;
}

export function TagsEditor({
	pendingTags,
	onPendingTagsChange,
}: TagsEditorProps) {
	const { t } = useTranslation();
	const inputRef = useRef<HTMLInputElement>(null);

	const [inputValue, setInputValue] = useState("");
	const [isShowingSuggestions, setIsShowingSuggestions] = useState(false);
	const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState<
		number | null
	>(null);

	const { data: allUserTags = [] } = useQuery({
		queryKey: ["tags"],
		queryFn: () => getTags(),
	});

	const suggestions = allUserTags
		.map((tag) => tag.name)
		.filter(
			(name) =>
				name.toLowerCase().includes(inputValue.toLowerCase()) &&
				!pendingTags.includes(name),
		);

	function addTag(
		name: string,
		options: { shouldKeepSuggestionsOpen?: boolean } = {},
	) {
		const trimmed = name.trim();
		if (trimmed && !pendingTags.includes(trimmed)) {
			onPendingTagsChange([...pendingTags, trimmed]);
		}
		setInputValue("");
		setIsShowingSuggestions(options.shouldKeepSuggestionsOpen ?? false);
		setHighlightedSuggestionIndex(null);
		inputRef.current?.focus();
		inputRef.current?.scrollIntoView({ block: "nearest" });
	}

	function removeTag(name: string) {
		onPendingTagsChange(pendingTags.filter((tag) => tag !== name));
	}

	function canNavigateSuggestions() {
		return isShowingSuggestions && suggestions.length > 0;
	}

	function highlightNextSuggestion() {
		if (!canNavigateSuggestions()) return;
		setHighlightedSuggestionIndex((current) =>
			current === null ? 0 : (current + 1) % suggestions.length,
		);
	}

	function highlightPreviousSuggestion() {
		if (!canNavigateSuggestions()) return;
		setHighlightedSuggestionIndex((current) =>
			current === null
				? suggestions.length - 1
				: (current - 1 + suggestions.length) % suggestions.length,
		);
	}

	function addHighlightedOrTypedTag() {
		if (
			highlightedSuggestionIndex !== null &&
			suggestions[highlightedSuggestionIndex]
		) {
			addTag(suggestions[highlightedSuggestionIndex], {
				shouldKeepSuggestionsOpen: true,
			});
		} else if (inputValue.trim()) {
			addTag(inputValue);
		}
	}

	function closeSuggestions() {
		setIsShowingSuggestions(false);
	}

	const keyDownHandlers: Record<string, () => void> = {
		ArrowDown: highlightNextSuggestion,
		ArrowUp: highlightPreviousSuggestion,
		Enter: addHighlightedOrTypedTag,
		",": addHighlightedOrTypedTag,
		Escape: closeSuggestions,
	};

	function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		const handleKey = keyDownHandlers[event.key];
		if (!handleKey) return;
		event.preventDefault();
		handleKey();
	}

	return (
		<div className="flex flex-col gap-2">
			<span className="text-sm text-muted-foreground">
				{t("mediaItem.tags")}
			</span>

			{pendingTags.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{pendingTags.map((tag) => (
						<span
							key={tag}
							className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm"
						>
							{tag}
							<button
								type="button"
								onClick={() => removeTag(tag)}
								className="text-muted-foreground hover:text-foreground transition-colors"
								aria-label={t("mediaItem.removeTag", { tag })}
							>
								<X className="size-3" />
							</button>
						</span>
					))}
				</div>
			)}

			<div className="relative">
				<Input
					ref={inputRef}
					value={inputValue}
					onChange={(e) => {
						setInputValue(e.target.value);
						setIsShowingSuggestions(true);
						setHighlightedSuggestionIndex(null);
					}}
					onKeyDown={handleInputKeyDown}
					onFocus={() => setIsShowingSuggestions(true)}
					onBlur={() => {
						// Delay to allow suggestion click to register
						setTimeout(() => setIsShowingSuggestions(false), 150);
					}}
					placeholder={t("mediaItem.addTag")}
					className="h-8 text-sm"
				/>
				{isShowingSuggestions && suggestions.length > 0 && (
					<ul className="absolute z-10 bottom-full mb-1 w-full bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
						{suggestions.map((suggestion, index) => (
							<li key={suggestion}>
								<button
									type="button"
									className={cn(
										"w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
										index === highlightedSuggestionIndex &&
											"bg-accent text-accent-foreground",
									)}
									onMouseDown={() => addTag(suggestion)}
								>
									{suggestion}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
