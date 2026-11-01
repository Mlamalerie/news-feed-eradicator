/** Daily counters of what the extension hid. Keys look like "youtube:music" or "tiktok:feed". */
export type StatsKind = 'music' | 'feed';
export type DayStats = Record<string, number>;
export type Stats = Record<string, DayStats>; // key: local date YYYY-MM-DD

export const KEEP_DAYS = 90;

export const statKey = (siteId: string, kind: StatsKind) => `${siteId}:${kind}`;

export const localDate = (d: Date = new Date()): string => {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const daysAgo = (n: number, from: Date = new Date()): string => {
	const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - n);
	return localDate(d);
};

export const dayTotal = (day: DayStats | undefined): number =>
	Object.values(day ?? {}).reduce((a, b) => a + b, 0);

/** Returns a copy with `count` added, and days older than KEEP_DAYS dropped. */
export const addToStats = (stats: Stats, date: string, key: string, count: number, now: Date = new Date()): Stats => {
	const cutoff = daysAgo(KEEP_DAYS, now);
	const next: Stats = {};
	for (const [d, v] of Object.entries(stats)) if (d >= cutoff) next[d] = v;
	const day = { ...(next[date] ?? {}) };
	day[key] = (day[key] ?? 0) + count;
	next[date] = day;
	return next;
};

/** Short text for the toolbar badge (it only fits ~4 characters). */
export const badgeText = (n: number): string => {
	if (n <= 0) return '';
	if (n < 1000) return String(n);
	return `${Math.floor(n / 1000)}k+`;
};
