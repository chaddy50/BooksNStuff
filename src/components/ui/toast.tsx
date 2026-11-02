import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "#/lib/utils";

const toastVariants = cva(
	"data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full data-[state=open]:slide-in-from-right-full flex items-start gap-3 rounded-md border p-4 shadow-lg",
	{
		variants: {
			variant: {
				default: "bg-background border text-foreground",
				destructive: "bg-destructive text-white",
				success:
					"border-green-600/30 bg-green-50 text-green-900 dark:border-green-500/30 dark:bg-green-950 dark:text-green-200",
				warning:
					"border-amber-600/30 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950 dark:text-amber-200",
				info: "border-blue-600/30 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-950 dark:text-blue-200",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function ToastViewport({
	className,
	...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
	return (
		<ToastPrimitive.Viewport
			data-slot="toast-viewport"
			className={cn(
				"fixed bottom-4 right-4 z-100 flex w-full max-w-sm flex-col gap-2 outline-none",
				className,
			)}
			{...props}
		/>
	);
}

function Toast({
	className,
	variant = "default",
	...props
}: React.ComponentProps<typeof ToastPrimitive.Root> &
	VariantProps<typeof toastVariants>) {
	return (
		<ToastPrimitive.Root
			data-slot="toast"
			data-variant={variant}
			className={cn(toastVariants({ variant, className }))}
			{...props}
		/>
	);
}

function ToastTitle({
	className,
	...props
}: React.ComponentProps<typeof ToastPrimitive.Title>) {
	return (
		<ToastPrimitive.Title
			data-slot="toast-title"
			className={cn("text-sm font-semibold", className)}
			{...props}
		/>
	);
}

function ToastDescription({
	className,
	...props
}: React.ComponentProps<typeof ToastPrimitive.Description>) {
	return (
		<ToastPrimitive.Description
			data-slot="toast-description"
			className={cn("text-sm", className)}
			{...props}
		/>
	);
}

function ToastClose({
	className,
	...props
}: React.ComponentProps<typeof ToastPrimitive.Close>) {
	return (
		<ToastPrimitive.Close
			data-slot="toast-close"
			className={cn(
				"ring-offset-background focus:ring-ring ml-auto rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			<XIcon />
			<span className="sr-only">Close</span>
		</ToastPrimitive.Close>
	);
}

export { Toast, ToastClose, ToastDescription, ToastTitle, ToastViewport };
