/**
 * Video length, read from the duration badge on a YouTube thumbnail ("12:34" or "1:02:03").
 * Pure helpers so they can be unit tested.
 */

/** Seconds for "mm:ss" or "h:mm:ss", or null when the text isn't a duration (e.g. "LIVE", empty). */
export const parseDurationSeconds = (text: string): number | null => {
	const m = /^\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*$/.exec(text);
	if (!m) return null;
	const hours = m[1] ? Number(m[1]) : 0;
	return hours * 3600 + Number(m[2]) * 60 + Number(m[3]);
};

/** True when the video is known to be shorter than `minMinutes` (0 means no limit). Unknown lengths are never hidden. */
export const isTooShort = (seconds: number | null, minMinutes: number): boolean =>
	minMinutes > 0 && seconds != null && seconds < minMinutes * 60;
