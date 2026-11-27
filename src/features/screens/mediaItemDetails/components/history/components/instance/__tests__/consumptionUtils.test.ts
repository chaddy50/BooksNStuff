import { describe, expect, it } from "vitest";
import type { UserSettings } from "#/database/schema";
import {
	getDefaultConsumptionInfo,
	getDefaultMethod,
	getMethodOptions,
} from "#/features/screens/mediaItemDetails/components/history/components/instance/consumptionUtils";
import {
	BookConsumptionMethod,
	GameControlMethod,
	GamePlatform,
	MediaItemType,
	MovieConsumptionMethod,
	TvShowConsumptionMethod,
} from "#/lib/enums";

const t = (key: string) => key;

describe("getDefaultMethod", () => {
	describe("without settings (hardcoded fallbacks)", () => {
		it("returns ebook for BOOK", () => {
			expect(getDefaultMethod(MediaItemType.BOOK)).toBe(
				BookConsumptionMethod.EBOOK,
			);
		});

		it("returns PC for VIDEO_GAME", () => {
			expect(getDefaultMethod(MediaItemType.VIDEO_GAME)).toBe(GamePlatform.PC);
		});

		it("returns local_copy for MOVIE", () => {
			expect(getDefaultMethod(MediaItemType.MOVIE)).toBe(
				MovieConsumptionMethod.LOCAL_COPY,
			);
		});

		it("returns local_copy for TV_SHOW", () => {
			expect(getDefaultMethod(MediaItemType.TV_SHOW)).toBe(
				TvShowConsumptionMethod.LOCAL_COPY,
			);
		});

		it("returns hardcoded default when settings is null", () => {
			expect(getDefaultMethod(MediaItemType.BOOK, null)).toBe(
				BookConsumptionMethod.EBOOK,
			);
		});
	});

	describe("with user settings", () => {
		it("uses defaultBookConsumptionMethod from settings", () => {
			const settings = {
				defaultBookConsumptionMethod: BookConsumptionMethod.AUDIOBOOK,
			} as UserSettings;
			expect(getDefaultMethod(MediaItemType.BOOK, settings)).toBe(
				BookConsumptionMethod.AUDIOBOOK,
			);
		});

		it("uses defaultMovieConsumptionMethod from settings", () => {
			const settings = {
				defaultMovieConsumptionMethod: MovieConsumptionMethod.THEATER,
			} as UserSettings;
			expect(getDefaultMethod(MediaItemType.MOVIE, settings)).toBe(
				MovieConsumptionMethod.THEATER,
			);
		});

		it("uses defaultTvShowConsumptionMethod from settings", () => {
			const settings = {
				defaultTvShowConsumptionMethod: TvShowConsumptionMethod.STREAMING,
			} as UserSettings;
			expect(getDefaultMethod(MediaItemType.TV_SHOW, settings)).toBe(
				TvShowConsumptionMethod.STREAMING,
			);
		});

		it("uses defaultGamePlatform from settings", () => {
			const settings = {
				defaultGamePlatform: GamePlatform.PS5,
			} as UserSettings;
			expect(getDefaultMethod(MediaItemType.VIDEO_GAME, settings)).toBe(
				GamePlatform.PS5,
			);
		});

		it("falls back to hardcoded default when settings field is null", () => {
			const settings = {
				defaultBookConsumptionMethod: null,
			} as unknown as UserSettings;
			expect(getDefaultMethod(MediaItemType.BOOK, settings)).toBe(
				BookConsumptionMethod.EBOOK,
			);
		});
	});
});

describe("getMethodOptions", () => {
	it("returns all book consumption methods with translated labels", () => {
		const options = getMethodOptions(MediaItemType.BOOK, t);
		const values = options.map((option) => option.value);
		expect(values).toContain(BookConsumptionMethod.HARDCOVER);
		expect(values).toContain(BookConsumptionMethod.PAPERBACK);
		expect(values).toContain(BookConsumptionMethod.EBOOK);
		expect(values).toContain(BookConsumptionMethod.AUDIOBOOK);
		expect(
			options.every(
				(option) => option.label === `consumption.method.${option.value}`,
			),
		).toBe(true);
	});

	it("returns all movie consumption methods with translated labels", () => {
		const options = getMethodOptions(MediaItemType.MOVIE, t);
		const values = options.map((option) => option.value);
		expect(values).toContain(MovieConsumptionMethod.THEATER);
		expect(values).toContain(MovieConsumptionMethod.STREAMING);
		expect(values).toContain(MovieConsumptionMethod.LOCAL_COPY);
		expect(
			options.every(
				(option) => option.label === `consumption.method.${option.value}`,
			),
		).toBe(true);
	});

	it("returns all tv show consumption methods with translated labels", () => {
		const options = getMethodOptions(MediaItemType.TV_SHOW, t);
		const values = options.map((option) => option.value);
		expect(values).toContain(TvShowConsumptionMethod.STREAMING);
		expect(values).toContain(TvShowConsumptionMethod.LOCAL_COPY);
		expect(
			options.every(
				(option) => option.label === `consumption.method.${option.value}`,
			),
		).toBe(true);
	});

	it("returns all game platforms with translated labels for VIDEO_GAME", () => {
		const options = getMethodOptions(MediaItemType.VIDEO_GAME, t);
		const values = options.map((option) => option.value);
		expect(values).toContain(GamePlatform.PC);
		expect(values).toContain(GamePlatform.PS5);
		expect(values).toContain(GamePlatform.PS4);
		expect(values).toContain(GamePlatform.NINTENDO_SWITCH);
		expect(
			options.every(
				(option) => option.label === `consumption.gamePlatform.${option.value}`,
			),
		).toBe(true);
	});

	it("returns options sorted alphabetically by label", () => {
		const bookOptions = getMethodOptions(MediaItemType.BOOK, t);
		const bookLabels = bookOptions.map((option) => option.label);
		expect(bookLabels).toEqual(
			[...bookLabels].sort((a, b) => a.localeCompare(b)),
		);

		const gameOptions = getMethodOptions(MediaItemType.VIDEO_GAME, t);
		const gameLabels = gameOptions.map((option) => option.label);
		expect(gameLabels).toEqual(
			[...gameLabels].sort((a, b) => a.localeCompare(b)),
		);
	});
});

describe("getDefaultConsumptionInfo", () => {
	it("returns just a method for non-game types", () => {
		expect(getDefaultConsumptionInfo(MediaItemType.BOOK)).toEqual({
			method: BookConsumptionMethod.EBOOK,
		});
	});

	it("includes a default control method for video games", () => {
		expect(getDefaultConsumptionInfo(MediaItemType.VIDEO_GAME)).toEqual({
			method: GamePlatform.PC,
			controlMethod: GameControlMethod.CONTROLLER,
		});
	});

	it("uses the user's saved default game platform and control method", () => {
		const settings = {
			defaultGamePlatform: GamePlatform.PS5,
			defaultGameControlMethod: GameControlMethod.MOUSE_AND_KEYBOARD,
		} as UserSettings;

		expect(
			getDefaultConsumptionInfo(MediaItemType.VIDEO_GAME, settings),
		).toEqual({
			method: GamePlatform.PS5,
			controlMethod: GameControlMethod.MOUSE_AND_KEYBOARD,
		});
	});
});
