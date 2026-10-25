import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { SeriesCompletionConfirmation } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import {
	confirmSeriesCompletion,
	updateSeriesStatus,
} from "#/features/screens/seriesDetails/seriesDetails";
import { MediaItemStatus } from "#/lib/enums";

export function useSeriesCompletionPrompt() {
	const router = useRouter();
	const [pendingConfirmation, setPendingConfirmation] =
		useState<SeriesCompletionConfirmation | null>(null);
	const [isResolving, setIsResolving] = useState(false);

	async function resolve(action: (seriesId: number) => Promise<unknown>) {
		if (!pendingConfirmation) return;
		setIsResolving(true);
		try {
			await action(pendingConfirmation.seriesId);
			router.invalidate();
		} finally {
			setIsResolving(false);
			setPendingConfirmation(null);
		}
	}

	function markWaiting() {
		resolve((seriesId) =>
			updateSeriesStatus({
				data: { seriesId, status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE },
			}),
		);
	}

	function markComplete() {
		resolve((seriesId) => confirmSeriesCompletion({ data: { seriesId } }));
	}

	return {
		pendingConfirmation,
		seriesName: pendingConfirmation?.seriesName ?? null,
		promptSeriesCompletion: setPendingConfirmation,
		isResolving,
		markWaiting,
		markComplete,
	};
}
