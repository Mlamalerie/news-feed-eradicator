import { describe, expect, test } from "bun:test";
import { addUsage, evaluateBlock, isLocked, newBlock, remaining, sanitizeBlocks, scheduleRangeUntil, statusForSite, type Block, type Usage } from "./blocks";

// Sunday 1 Nov 2026 is a Sunday (getDay() === 0); Monday 2 Nov is 1.
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);

const block = (over: Partial<Block> = {}): Block => ({ ...newBlock('b1'), siteIds: ['youtube'], schedule: [], ...over });

describe('schedule', () => {
	const weekdays9to17 = { days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' };

	test('inside, outside and at the edges of a daytime range', () => {
		expect(scheduleRangeUntil(weekdays9to17, at(2, 10))).toBe(at(2, 17).getTime());
		expect(scheduleRangeUntil(weekdays9to17, at(2, 9, 0))).toBe(at(2, 17).getTime());
		expect(scheduleRangeUntil(weekdays9to17, at(2, 17, 0))).toBeNull();
		expect(scheduleRangeUntil(weekdays9to17, at(2, 8, 59))).toBeNull();
		expect(scheduleRangeUntil(weekdays9to17, at(1, 10))).toBeNull(); // Sunday
	});

	test('overnight range belongs to the day it starts', () => {
		const night = { days: [0], start: '22:00', end: '07:00' }; // Sunday night
		expect(scheduleRangeUntil(night, at(1, 23))).toBe(at(2, 7).getTime());
		expect(scheduleRangeUntil(night, at(2, 6, 30))).toBe(at(2, 7).getTime()); // Monday morning
		expect(scheduleRangeUntil(night, at(1, 6, 30))).toBeNull(); // Saturday night is not selected
		expect(scheduleRangeUntil(night, at(2, 23))).toBeNull(); // Monday night is not selected
	});

	test('same start and end means all day', () => {
		expect(scheduleRangeUntil({ days: [2], start: '00:00', end: '00:00' }, at(3, 15))).toBe(at(4, 0).getTime());
	});
});

describe('limits', () => {
	let usage: Usage = {};
	usage = addUsage(usage, 'youtube', 20 * 60, at(2, 10, 5));
	usage = addUsage(usage, 'tiktok', 15 * 60, at(2, 11, 5));

	test('daily limit sums all of the block\'s sites and lasts until midnight', () => {
		const b = block({ siteIds: ['youtube', 'tiktok'], dailyLimitMin: 30 });
		expect(evaluateBlock(b, usage, at(2, 12))).toEqual([{ blockId: 'b1', name: 'Deep focus', strict: false, reason: 'daily', until: at(3, 0).getTime() }]);
		expect(evaluateBlock({ ...b, dailyLimitMin: 40 }, usage, at(2, 12))).toEqual([]);
		expect(remaining({ ...b, dailyLimitMin: 40 }, usage, at(2, 12)).dailyMin).toBe(5);
		// a new day starts fresh
		expect(evaluateBlock(b, usage, at(3, 12))).toEqual([]);
	});

	test('hourly limit counts the current clock hour only', () => {
		const b = block({ hourlyLimitMin: 15 });
		expect(evaluateBlock(b, usage, at(2, 10, 30)).map(s => [s.reason, s.until])).toEqual([['hourly', at(2, 11).getTime()]]);
		expect(evaluateBlock(b, usage, at(2, 11, 30))).toEqual([]);
	});

	test('sites outside the block do not count', () => {
		expect(evaluateBlock(block({ siteIds: ['instagram'], dailyLimitMin: 1 }), usage, at(2, 12))).toEqual([]);
	});

	test('addUsage drops old days and does not mutate', () => {
		const before = { '2026-10-01': { youtube: [5] } };
		const after = addUsage(before, 'youtube', 10, at(2, 0));
		expect(Object.keys(after)).toEqual(['2026-11-02']);
		expect(before['2026-10-01'].youtube).toEqual([5]);
	});
});

describe('statusForSite and strict mode', () => {
	const schedule = [{ days: [1], start: '09:00', end: '17:00' }];

	test('longest restriction wins', () => {
		let usage = addUsage({}, 'youtube', 3600, at(2, 10));
		const blocks = [block({ id: 'a', schedule }), block({ id: 'b', hourlyLimitMin: 10 })];
		expect(statusForSite(blocks, 'youtube', usage, at(2, 10, 30), false)?.blockId).toBe('a');
		expect(statusForSite(blocks, 'instagram', usage, at(2, 10, 30), false)).toBeNull();
	});

	test('snooze lifts normal blocks but not strict ones', () => {
		expect(statusForSite([block({ schedule })], 'youtube', {}, at(2, 10), true)).toBeNull();
		expect(statusForSite([block({ schedule, strict: true })], 'youtube', {}, at(2, 10), true)?.strict).toBe(true);
	});

	test('disabled blocks and blocks without sites never apply', () => {
		expect(evaluateBlock(block({ schedule, enabled: false }), {}, at(2, 10))).toEqual([]);
		expect(evaluateBlock(block({ schedule, siteIds: [] }), {}, at(2, 10))).toEqual([]);
	});

	test('isLocked only while a strict block is active', () => {
		expect(isLocked(block({ schedule, strict: true }), {}, at(2, 10))).toBe(true);
		expect(isLocked(block({ schedule, strict: true }), {}, at(2, 18))).toBe(false);
		expect(isLocked(block({ schedule }), {}, at(2, 10))).toBe(false);
	});
});

test('sanitizeBlocks keeps valid data and fixes the rest', () => {
	const [b] = sanitizeBlocks([{ id: 'x', name: '  ', siteIds: ['youtube', 'youtube', 3], schedule: [{ days: [9, 1, 1], start: '9:00', end: '25:00' }, { days: [1], start: '08:00', end: '12:00' }], dailyLimitMin: '30', hourlyLimitMin: -5, strict: 'yes' }, null, { nope: 1 }]);
	expect(sanitizeBlocks('garbage')).toEqual([]);
	expect(b).toEqual({ id: 'x', name: 'Block', enabled: true, siteIds: ['youtube'], schedule: [{ days: [1], start: '08:00', end: '12:00' }], dailyLimitMin: 30, hourlyLimitMin: null, strict: false });
});
