import { useRouter, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

interface UseGenrePromptArgs {
	genreId: number | null;
}

export function useGenrePrompt({ genreId }: UseGenrePromptArgs) {
	const router = useRouter();
	const locationState = useRouterState({
		select: (state) => state.location.state,
	});
	const suggestedGenres = locationState?.genreSuggestions ?? [];
	const [isOpen, setIsOpen] = useState(
		() => locationState?.genreSuggestions !== undefined && genreId === null,
	);

	function close() {
		setIsOpen(false);
		router.invalidate();
	}

	return { isOpen, suggestedGenres, close };
}
