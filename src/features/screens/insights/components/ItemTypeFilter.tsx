import { useTranslation } from "react-i18next";

import { MultiSelectFilter } from "#/components/ui/multi-select-filter";
import { MediaItemType } from "#/lib/enums";

const ITEM_TYPES = [
	MediaItemType.BOOK,
	MediaItemType.MOVIE,
	MediaItemType.TV_SHOW,
	MediaItemType.VIDEO_GAME,
	MediaItemType.PODCAST,
] as const;

type Props = {
	selectedItemTypes: MediaItemType[];
	onToggle: (itemType: MediaItemType) => void;
	onClear?: () => void;
};

export function ItemTypeFilter({
	selectedItemTypes,
	onToggle,
	onClear,
}: Props) {
	const { t } = useTranslation();

	return (
		<div className="relative">
			<MultiSelectFilter
				label={t("insights.itemTypeFilter.label")}
				options={ITEM_TYPES.map((itemType) => ({
					value: itemType,
					label: t(`mediaType.${itemType}`),
				}))}
				selectedValues={selectedItemTypes}
				onToggle={(value) => onToggle(value as MediaItemType)}
				onClear={onClear}
				clearAriaLabel={t("library.clearFilters")}
			/>
		</div>
	);
}
