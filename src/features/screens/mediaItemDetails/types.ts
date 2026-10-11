export const MEDIA_ITEM_DETAILS_TAB_IDS = [
	"overview",
	"history",
	"related",
] as const;

export type MediaItemDetailsTabId = (typeof MEDIA_ITEM_DETAILS_TAB_IDS)[number];
