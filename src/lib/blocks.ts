/**
 * Blocks: a group of sites plus restrictions that decide when those sites are blocked.
 * Modelled on phone "app blocker" apps: a weekly schedule, a daily usage limit and an hourly
 * usage limit, optionally in strict mode (no pausing or editing while the block is active).
 *
 * Everything here is pure (no browser APIs) so it can be unit tested. All times are local.
 */

export type ScheduleRange = {
	/** 0 = Sunday ... 6 = Saturday, like Date.getDay() */
	days: number[];
	/** "HH:MM", 24h. If end <= start the range runs past midnight into the next day. */
	start: string;
	end: string;
};

export type Block = {
	id: string;
	name: string;
	enabled: boolean;
	siteIds: string[];
	schedule: ScheduleRange[];
	/** Minutes per day across all the block's sites, or null for no limit */
	dailyLimitMin: number | null;
	/** Minutes per clock hour across all the block's sites, or null for no limit */
	hourlyLimitMin: number | null;
	/** While active, the block can't be paused (snooze), edited, deleted or have its sites switched off */
	strict: boolean;
};

/** Seconds spent per site per clock hour: usage[YYYY-MM-DD][siteId][hour 0-23] */
export type Usage = Record<string, Record<string, number[]>>;

export type BlockReason = 'schedule' | 'daily' | 'hourly';

export type BlockStatus = {
	blockId: string;
	name: string;
	reason: BlockReason;
	/** Epoch ms when the block stops applying */
	until: number;
	strict: boolean;
};

export const USAGE_KEEP_DAYS = 14;

const pad = (n: number) => String(n).padStart(2, '0');
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseHM = (hm: string): number | null => {
	const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
	if (!m) return null;
	const h = Number(m[1]), min = Number(m[2]);
	if (h > 24 || min > 59 || (h === 24 && min !== 0)) return null;
	return h * 60 + min;
};

const atMinutes = (day: Date, minutes: number, dayOffset = 0) =>
	new Date(day.getFullYear(), day.getMonth(), day.getDate() + dayOffset, 0, minutes).getTime();

/** Returns when the range stops applying if it applies at `now`, else null. */
export const scheduleRangeUntil = (range: ScheduleRange, now: Date): number | null => {
	const s = parseHM(range.start), e = parseHM(range.end);
	if (s == null || e == null || range.days.length === 0) return null;
	const t = now.getHours() * 60 + now.getMinutes();
	const today = now.getDay();
	const yesterday = (today + 6) % 7;

	if (s === e) {
		// Same start and end means "all day"
		return range.days.includes(today) ? atMinutes(now, 0, 1) : null;
	}
	if (s < e) {
		return range.days.includes(today) && t >= s && t < e ? atMinutes(now, e) : null;
	}
	// Overnight range, e.g. 22:00 -> 07:00
	if (range.days.includes(today) && t >= s) return atMinutes(now, e, 1);
	if (range.days.includes(yesterday) && t < e) return atMinutes(now, e);
	return null;
};

const siteSeconds = (usage: Usage, now: Date, siteIds: string[]) => {
	const day = usage[dateKey(now)] ?? {};
	let total = 0, hour = 0;
	for (const id of siteIds) {
		const hours = day[id];
		if (!hours) continue;
		for (const s of hours) total += s ?? 0;
		hour += hours[now.getHours()] ?? 0;
	}
	return { total, hour };
};

export const usedSeconds = (block: Pick<Block, 'siteIds'>, usage: Usage, now: Date) => siteSeconds(usage, now, block.siteIds);

/** Every restriction of this block that applies right now. */
export const evaluateBlock = (block: Block, usage: Usage, now: Date): BlockStatus[] => {
	if (!block.enabled || block.siteIds.length === 0) return [];
	const out: BlockStatus[] = [];
	const base = { blockId: block.id, name: block.name, strict: block.strict };

	for (const range of block.schedule) {
		const until = scheduleRangeUntil(range, now);
		if (until != null) out.push({ ...base, reason: 'schedule', until });
	}

	const used = usedSeconds(block, usage, now);
	if (block.dailyLimitMin != null && used.total >= block.dailyLimitMin * 60) {
		out.push({ ...base, reason: 'daily', until: atMinutes(now, 0, 1) });
	}
	if (block.hourlyLimitMin != null && used.hour >= block.hourlyLimitMin * 60) {
		out.push({ ...base, reason: 'hourly', until: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1).getTime() });
	}
	return out;
};

/** True when the block is strict and currently active: it must not be changed. */
export const isLocked = (block: Block, usage: Usage, now: Date) => block.strict && evaluateBlock(block, usage, now).length > 0;

/**
 * The restriction that blocks a site right now, if any. When several apply, the one that lasts
 * longest wins. While snoozing, only strict blocks still apply.
 */
export const statusForSite = (blocks: Block[], siteId: string, usage: Usage, now: Date, snoozing: boolean): BlockStatus | null => {
	let best: BlockStatus | null = null;
	for (const block of blocks) {
		if (!block.siteIds.includes(siteId)) continue;
		if (snoozing && !block.strict) continue;
		for (const status of evaluateBlock(block, usage, now)) {
			if (best == null || status.until > best.until) best = status;
		}
	}
	return best;
};

/** Minutes left today / this hour for a block's limits (null when there is no limit). */
export const remaining = (block: Block, usage: Usage, now: Date) => {
	const used = usedSeconds(block, usage, now);
	return {
		dailyMin: block.dailyLimitMin == null ? null : Math.max(0, Math.ceil((block.dailyLimitMin * 60 - used.total) / 60)),
		hourlyMin: block.hourlyLimitMin == null ? null : Math.max(0, Math.ceil((block.hourlyLimitMin * 60 - used.hour) / 60)),
	};
};

/** Returns a new Usage with `seconds` added for the site at `now`, dropping days older than USAGE_KEEP_DAYS. */
export const addUsage = (usage: Usage, siteId: string, seconds: number, now: Date): Usage => {
	const cutoff = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - USAGE_KEEP_DAYS));
	const next: Usage = {};
	for (const [d, v] of Object.entries(usage)) if (d >= cutoff) next[d] = v;
	const key = dateKey(now);
	const day = { ...(next[key] ?? {}) };
	const hours = (day[siteId] ?? []).slice();
	for (let i = 0; i < 24; i++) hours[i] = hours[i] ?? 0;
	hours[now.getHours()] = (hours[now.getHours()] ?? 0) + seconds;
	day[siteId] = hours;
	next[key] = day;
	return next;
};

/// Validation of anything read from storage or typed by the user

const clampLimit = (v: unknown): number | null => {
	if (v == null || v === '') return null;
	const n = Math.floor(Number(v));
	return Number.isFinite(n) && n >= 0 && n <= 1440 ? n : null;
};

export const sanitizeBlock = (raw: any): Block | null => {
	if (raw == null || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
	const schedule: ScheduleRange[] = Array.isArray(raw.schedule) ? raw.schedule
		.filter((r: any) => r && parseHM(String(r.start)) != null && parseHM(String(r.end)) != null)
		.map((r: any) => ({
			days: Array.isArray(r.days) ? [...new Set<number>(r.days.map(Number).filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [],
			start: String(r.start).trim(),
			end: String(r.end).trim(),
		})) : [];
	return {
		id: raw.id.slice(0, 40),
		name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 60) : 'Block',
		enabled: raw.enabled !== false,
		siteIds: Array.isArray(raw.siteIds) ? [...new Set<string>(raw.siteIds.filter((s: unknown) => typeof s === 'string'))] : [],
		schedule,
		dailyLimitMin: clampLimit(raw.dailyLimitMin),
		hourlyLimitMin: clampLimit(raw.hourlyLimitMin),
		strict: raw.strict === true,
	};
};

export const sanitizeBlocks = (raw: unknown): Block[] =>
	Array.isArray(raw) ? raw.map(sanitizeBlock).filter((b): b is Block => b != null) : [];

export const newBlock = (id: string): Block => ({
	id,
	name: 'Deep focus',
	enabled: true,
	siteIds: [],
	schedule: [{ days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' }],
	dailyLimitMin: null,
	hourlyLimitMin: null,
	strict: false,
});
