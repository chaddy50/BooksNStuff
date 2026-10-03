import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import { SearchPopup } from "#/features/mediaItemSearch/MediaItemSearchPopup";

export function AddMediaButton() {
	const { t } = useTranslation();
	const [isSearchOpen, setIsSearchOpen] = useState(false);

	return (
		<>
			<Button
				variant="outline"
				size="icon"
				className="max-sm:size-11 max-md:h-11 sm:w-auto sm:px-4"
				onClick={() => setIsSearchOpen(true)}
			>
				<Plus className="size-4" />
				<span className="sr-only sm:not-sr-only sm:ml-1">
					{t("search.addButton")}
				</span>
			</Button>
			<SearchPopup
				isOpen={isSearchOpen}
				onClose={() => setIsSearchOpen(false)}
			/>
		</>
	);
}
