import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

const LINE_HEIGHT_EM = 1.625;

interface MarkdownTextBlockProps {
	text: string;
	maxLines?: number;
}

export function MarkdownTextBlock({
	text,
	maxLines = 7,
}: MarkdownTextBlockProps) {
	const { t } = useTranslation();
	const contentRef = useRef<HTMLDivElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: text and maxLines are triggers here, not read in the body — re-measuring overflow whenever the rendered content changes is the whole point
	useEffect(() => {
		const element = contentRef.current;
		if (element) {
			setIsOverflowing(element.scrollHeight > element.clientHeight);
		}
	}, [text, maxLines]);

	return (
		<div>
			<div
				ref={contentRef}
				className="prose prose-sm dark:prose-invert max-w-none text-foreground"
				style={
					isExpanded
						? undefined
						: {
								maxHeight: `calc(${maxLines} * ${LINE_HEIGHT_EM}em)`,
								overflow: "hidden",
							}
				}
			>
				<ReactMarkdown remarkPlugins={[remarkBreaks]}>{text}</ReactMarkdown>
			</div>
			{isOverflowing && (
				<button
					type="button"
					onClick={() => setIsExpanded((previous) => !previous)}
					className="mt-1 ml-auto block text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					{isExpanded ? t("common.showLess") : t("common.showMore")}
				</button>
			)}
		</div>
	);
}
