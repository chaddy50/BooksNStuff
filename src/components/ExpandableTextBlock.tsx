import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const LINE_CLAMP_CLASSES: Record<number, string> = {
	3: "line-clamp-3",
	4: "line-clamp-4",
	5: "line-clamp-5",
	6: "line-clamp-6",
	7: "line-clamp-7",
};

interface ExpandableTextBlockProps {
	text: string;
	maxLines?: number;
}

export function ExpandableTextBlock({
	text,
	maxLines = 7,
}: ExpandableTextBlockProps) {
	const { t } = useTranslation();
	const paragraphRef = useRef<HTMLParagraphElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: text and maxLines are triggers here, not read in the body — re-measuring overflow whenever the rendered content changes is the whole point
	useEffect(() => {
		const el = paragraphRef.current;
		if (el) {
			setIsOverflowing(el.scrollHeight > el.clientHeight);
		}
	}, [text, maxLines]);

	const clampClass = LINE_CLAMP_CLASSES[maxLines] ?? "line-clamp-5";

	return (
		<div>
			<p
				ref={paragraphRef}
				className={`text-foreground text-sm leading-relaxed ${isExpanded ? "" : clampClass}`}
			>
				{text}
			</p>
			{isOverflowing && (
				<button
					type="button"
					onClick={() => setIsExpanded((prev) => !prev)}
					className="mt-1 ml-auto block text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					{isExpanded ? t("common.showLess") : t("common.showMore")}
				</button>
			)}
		</div>
	);
}
