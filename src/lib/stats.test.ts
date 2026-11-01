import { describe, expect, test } from "bun:test";
import { addToStats, badgeText, dayTotal, daysAgo, localDate } from "./stats";

describe('stats', () => {
	const now = new Date(2026, 10, 1, 17, 0); // 1 Nov 2026, local time

	test('localDate and daysAgo use local calendar days', () => {
		expect(localDate(now)).toBe('2026-11-01');
		expect(daysAgo(1, now)).toBe('2026-10-31');
		expect(daysAgo(31, now)).toBe('2026-10-01');
	});

	test('addToStats accumulates per day and key', () => {
		let s = addToStats({}, '2026-11-01', 'youtube:music', 3, now);
		s = addToStats(s, '2026-11-01', 'youtube:music', 2, now);
		s = addToStats(s, '2026-11-01', 'tiktok:feed', 1, now);
		expect(s['2026-11-01']).toEqual({ 'youtube:music': 5, 'tiktok:feed': 1 });
		expect(dayTotal(s['2026-11-01'])).toBe(6);
	});

	test('addToStats does not mutate its input and drops days older than 90', () => {
		const old = { '2026-01-01': { 'x:feed': 9 }, '2026-10-01': { 'x:feed': 1 } };
		const s = addToStats(old, '2026-11-01', 'x:feed', 1, now);
		expect(Object.keys(s)).toEqual(['2026-10-01', '2026-11-01']);
		expect(Object.keys(old)).toHaveLength(2);
	});

	test('badgeText', () => {
		expect(badgeText(0)).toBe('');
		expect(badgeText(42)).toBe('42');
		expect(badgeText(999)).toBe('999');
		expect(badgeText(1500)).toBe('1k+');
	});
});
