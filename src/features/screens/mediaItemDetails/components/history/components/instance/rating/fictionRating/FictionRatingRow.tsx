import { Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AutoResizeTextarea } from "#/components/AutoResizeTextarea";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { RatingStars } from "../ratingStars/RatingStars";

type FictionRatingRowProps = {
	title: string;
	rating: number;
	comment?: string;
	updateRating: (value: number) => void;
	updateComment: (value: string) => void;
};

export function FictionRatingRow({
	title,
	rating,
	comment,
	updateRating,
	updateComment,
}: FictionRatingRowProps) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(comment ?? "");

	function handleOpenChange(open: boolean) {
		if (open) setDraft(comment ?? "");
		setOpen(open);
	}

	function handleSave() {
		updateComment(draft);
		setOpen(false);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground w-32">{title}</span>
					<RatingStars
						rating={rating}
						updateRating={updateRating}
						shouldShowIfNoRating={true}
					/>
				</div>
				{comment ? (
					<div className="group/comment flex items-center min-w-0 overflow-hidden sm:w-fit sm:max-w-full">
						<span className="min-w-0 truncate text-sm text-muted-foreground">
							{comment}
						</span>
						<DialogTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								className="shrink-0 overflow-hidden w-8 opacity-100 sm:w-0 sm:opacity-0 text-muted-foreground bg-card hover:bg-accent sm:group-hover/comment:w-8 sm:group-hover/comment:opacity-100 transition-all duration-200"
							>
								<Pencil />
							</Button>
						</DialogTrigger>
					</div>
				) : (
					<DialogTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground self-start sm:self-auto"
						>
							{t("fictionRating.addComment")}
						</Button>
					</DialogTrigger>
				)}
			</div>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className="sr-only">
						{t("fictionRating.commentDescription")}
					</DialogDescription>
				</DialogHeader>
				<AutoResizeTextarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					minRows={4}
					maxRows={12}
					autoFocus
				/>
				<DialogFooter>
					<Button onClick={handleSave}>{t("mediaItemDetails.save")}</Button>
					<Button variant="outline" onClick={() => setOpen(false)}>
						{t("mediaItemDetails.cancel")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
