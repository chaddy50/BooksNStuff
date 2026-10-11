import { useTranslation } from "react-i18next";
import { cn } from "#/lib/utils";
import type { MediaItemDetailsTabId } from "../types";

const TABS: { id: MediaItemDetailsTabId; labelKey: string }[] = [
	{ id: "overview", labelKey: "mediaItemDetails.overview" },
	{ id: "history", labelKey: "mediaItemDetails.history" },
	{ id: "related", labelKey: "relatedItems.title" },
];

interface MediaItemDetailsTabStripProps {
	activeTabId: MediaItemDetailsTabId;
	onSelect: (tabId: MediaItemDetailsTabId) => void;
}

export function MediaItemDetailsTabStrip({
	activeTabId,
	onSelect,
}: MediaItemDetailsTabStripProps) {
	const { t } = useTranslation();

	return (
		<div
			role="tablist"
			aria-label={t("mediaItemDetails.tabsLabel")}
			className="flex flex-wrap items-center gap-1 border-b border-border"
		>
			{TABS.map((tab) => {
				const isActive = tab.id === activeTabId;
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						id={`media-item-details-tab-${tab.id}`}
						aria-selected={isActive}
						aria-controls={`media-item-details-panel-${tab.id}`}
						onClick={() => onSelect(tab.id)}
						className={cn(
							"-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-t-md",
							isActive
								? "border-foreground text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						{t(tab.labelKey as never)}
					</button>
				);
			})}
		</div>
	);
}
