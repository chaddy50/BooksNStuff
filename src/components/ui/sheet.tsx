import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";
import {
	createContext,
	type PointerEvent as ReactPointerEvent,
	useContext,
	useRef,
	useState,
} from "react";

import { cn } from "#/lib/utils";

const SheetCloseContext = createContext<(() => void) | null>(null);

// Dragged further than this many pixels before release counts as "flung away".
const DISMISS_THRESHOLD_PX = 100;

function wasDismissGesture(draggedBy: number, contentHeight: number) {
	const draggedPastQuarterHeight =
		contentHeight > 0 && draggedBy > contentHeight * 0.25;
	return draggedBy > DISMISS_THRESHOLD_PX || draggedPastQuarterHeight;
}

function Sheet({
	onOpenChange,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return (
		<SheetCloseContext.Provider value={() => onOpenChange?.(false)}>
			<DialogPrimitive.Root
				data-slot="sheet"
				onOpenChange={onOpenChange}
				{...props}
			/>
		</SheetCloseContext.Provider>
	);
}

function SheetTrigger({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="sheet-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
				className,
			)}
			{...props}
		/>
	);
}

/** Drag-to-dismiss handle shown at the top of the sheet, mimicking a native bottom sheet. */
function SheetDragHandle({
	contentRef,
	isDragging,
	onDragStateChange,
	onDragOffsetChange,
}: {
	contentRef: React.RefObject<HTMLDivElement | null>;
	isDragging: boolean;
	onDragStateChange: (isDragging: boolean) => void;
	onDragOffsetChange: (offset: number) => void;
}) {
	const closeSheet = useContext(SheetCloseContext);
	const startYRef = useRef(0);

	function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
		onDragStateChange(true);
		startYRef.current = e.clientY;
		e.currentTarget.setPointerCapture?.(e.pointerId);
	}

	function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
		if (!isDragging) return;
		onDragOffsetChange(Math.max(0, e.clientY - startYRef.current));
	}

	function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
		if (!isDragging) return;
		const draggedBy = Math.max(0, e.clientY - startYRef.current);
		const contentHeight = contentRef.current?.offsetHeight ?? 0;
		onDragStateChange(false);
		onDragOffsetChange(0);
		if (wasDismissGesture(draggedBy, contentHeight)) {
			closeSheet?.();
		}
	}

	return (
		<div
			data-slot="sheet-drag-handle"
			className="flex justify-center pt-3 pb-1 touch-none cursor-grab active:cursor-grabbing"
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
		>
			<span
				aria-hidden="true"
				className="h-1.5 w-10 rounded-full bg-muted-foreground/30"
			/>
		</div>
	);
}

function SheetContent({
	className,
	children,
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
	showCloseButton?: boolean;
}) {
	const contentRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState(0);

	return (
		<SheetPortal>
			<SheetOverlay />
			<DialogPrimitive.Content
				ref={contentRef}
				data-slot="sheet-content"
				style={
					dragOffset
						? { transform: `translateY(${dragOffset}px)`, transition: "none" }
						: undefined
				}
				className={cn(
					"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-xl border-t shadow-lg duration-300 outline-none max-h-[85vh]",
					className,
				)}
				{...props}
			>
				<SheetDragHandle
					contentRef={contentRef}
					isDragging={isDragging}
					onDragStateChange={setIsDragging}
					onDragOffsetChange={setDragOffset}
				/>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="sheet-close"
						className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
					>
						<XIcon className="size-4" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</SheetPortal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn(
				"flex flex-col gap-1.5 px-6 py-4 border-b border-border",
				className,
			)}
			{...props}
		/>
	);
}

function SheetTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="sheet-title"
			className={cn("text-base font-semibold", className)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="sheet-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetPortal,
	SheetTitle,
	SheetTrigger,
};
