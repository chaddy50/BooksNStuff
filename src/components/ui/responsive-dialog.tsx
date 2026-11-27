import type * as React from "react";
import { useIsMobile } from "#/components/hooks/useIsMobile";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { cn } from "#/lib/utils";

interface ResponsiveDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
	className?: string;
	showCloseButton?: boolean;
}

function ResponsiveDialog({
	open,
	onOpenChange,
	children,
	className,
	showCloseButton = true,
}: ResponsiveDialogProps) {
	const isMobile = useIsMobile();

	if (isMobile) {
		return (
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent className={className} showCloseButton={false}>
					{children}
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={className} showCloseButton={showCloseButton}>
				{children}
			</DialogContent>
		</Dialog>
	);
}

function ResponsiveDialogHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	const isMobile = useIsMobile();
	const Header = isMobile ? SheetHeader : DialogHeader;
	return <Header className={className} {...props} />;
}

function ResponsiveDialogTitle({
	className,
	...props
}: React.ComponentProps<"h2">) {
	const isMobile = useIsMobile();
	const Title = isMobile ? SheetTitle : DialogTitle;
	return <Title className={className} {...props} />;
}

function ResponsiveDialogDescription({
	className,
	...props
}: React.ComponentProps<"p">) {
	return <DialogDescription className={className} {...props} />;
}

/** Wraps a modal's main content. Dialog already pads itself uniformly, but Sheet only pads its header — this supplies the matching inset for everything in between. */
function ResponsiveDialogBody({
	className,
	...props
}: React.ComponentProps<"div">) {
	const isMobile = useIsMobile();
	return (
		<div
			data-slot="responsive-dialog-body"
			className={cn(isMobile && "px-6 py-4 overflow-y-auto", className)}
			{...props}
		/>
	);
}

function ResponsiveDialogFooter({
	className,
	...props
}: React.ComponentProps<"div">) {
	const isMobile = useIsMobile();
	return (
		<div
			data-slot="responsive-dialog-footer"
			className={cn(
				"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
				isMobile && "px-6 pt-4 pb-6 border-t border-border",
				className,
			)}
			{...props}
		/>
	);
}

export {
	ResponsiveDialog,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
	ResponsiveDialogDescription,
	ResponsiveDialogBody,
	ResponsiveDialogFooter,
};
