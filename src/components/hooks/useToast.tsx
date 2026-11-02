import { Toast as ToastPrimitive } from "radix-ui";
import { createContext, type ReactNode, useContext, useState } from "react";
import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastViewport,
} from "#/components/ui/toast";

type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

interface ToastOptions {
	variant?: ToastVariant;
	duration?: number;
}

interface ToastMessage {
	id: string;
	description: string;
	variant: ToastVariant;
	duration: number;
}

interface ToastContextValue {
	toast: (description: string, options?: ToastOptions) => void;
}

const DEFAULT_TOAST_VARIANT: ToastVariant = "default";
const DEFAULT_TOAST_DURATION_IN_MILLISECONDS = 5000;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

	function toast(description: string, options?: ToastOptions) {
		const toastMessage: ToastMessage = {
			id: crypto.randomUUID(),
			description,
			variant: options?.variant ?? DEFAULT_TOAST_VARIANT,
			duration: options?.duration ?? DEFAULT_TOAST_DURATION_IN_MILLISECONDS,
		};
		setToastMessages((currentToastMessages) => [
			...currentToastMessages,
			toastMessage,
		]);
	}

	function removeToastMessage(id: string) {
		setToastMessages((currentToastMessages) =>
			currentToastMessages.filter((toastMessage) => toastMessage.id !== id),
		);
	}

	return (
		<ToastContext.Provider value={{ toast }}>
			<ToastPrimitive.Provider>
				<ToastViewport>
					{toastMessages.map((toastMessage) => (
						<Toast
							key={toastMessage.id}
							variant={toastMessage.variant}
							duration={toastMessage.duration}
							onOpenChange={(isOpen) => {
								if (!isOpen) {
									removeToastMessage(toastMessage.id);
								}
							}}
						>
							<ToastDescription>{toastMessage.description}</ToastDescription>
							<ToastClose />
						</Toast>
					))}
				</ToastViewport>
				{children}
			</ToastPrimitive.Provider>
		</ToastContext.Provider>
	);
}

export function useToast(): ToastContextValue {
	const value = useContext(ToastContext);
	if (value === undefined) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return value;
}
