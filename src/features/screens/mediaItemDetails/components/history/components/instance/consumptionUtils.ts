import type { ConsumptionInfo, UserSettings } from "#/database/schema";
import {
	BookConsumptionMethod,
	GameControlMethod,
	GamePlatform,
	MediaItemType,
	MovieConsumptionMethod,
	TvShowConsumptionMethod,
} from "#/lib/enums";

export type MethodOption = { value: string; label: string };

export function getDefaultMethod(
	mediaItemType: MediaItemType,
	settings?: UserSettings | null,
): string {
	if (mediaItemType === MediaItemType.BOOK) {
		return (
			settings?.defaultBookConsumptionMethod ?? BookConsumptionMethod.EBOOK
		);
	}
	if (mediaItemType === MediaItemType.VIDEO_GAME) {
		return settings?.defaultGamePlatform ?? GamePlatform.PC;
	}
	if (mediaItemType === MediaItemType.MOVIE) {
		return (
			settings?.defaultMovieConsumptionMethod ??
			MovieConsumptionMethod.LOCAL_COPY
		);
	}
	return (
		settings?.defaultTvShowConsumptionMethod ??
		TvShowConsumptionMethod.LOCAL_COPY
	);
}

/** The consumption info an instance should start with before the user picks one explicitly — e.g. so a freshly-started game already shows its platform and control method. */
export function getDefaultConsumptionInfo(
	mediaItemType: MediaItemType,
	settings?: UserSettings | null,
): ConsumptionInfo {
	const method = getDefaultMethod(mediaItemType, settings);
	if (mediaItemType !== MediaItemType.VIDEO_GAME) {
		return { method };
	}
	return {
		method,
		controlMethod:
			settings?.defaultGameControlMethod ?? GameControlMethod.CONTROLLER,
	};
}

export function getMethodOptions(
	mediaItemType: MediaItemType,
	t: (key: string) => string,
): MethodOption[] {
	if (mediaItemType === MediaItemType.VIDEO_GAME) {
		return Object.values(GamePlatform)
			.sort((a, b) =>
				t(`consumption.gamePlatform.${a}`).localeCompare(
					t(`consumption.gamePlatform.${b}`),
				),
			)
			.map((platform) => ({
				value: platform,
				label: t(`consumption.gamePlatform.${platform}`),
			}));
	}
	const methods =
		mediaItemType === MediaItemType.BOOK
			? Object.values(BookConsumptionMethod)
			: mediaItemType === MediaItemType.MOVIE
				? Object.values(MovieConsumptionMethod)
				: Object.values(TvShowConsumptionMethod);
	return methods
		.sort((a, b) =>
			t(`consumption.method.${a}`).localeCompare(t(`consumption.method.${b}`)),
		)
		.map((method) => ({
			value: method,
			label: t(`consumption.method.${method}`),
		}));
}
