import { describe, expect, test } from "bun:test";
import { isTooShort, parseDurationSeconds } from "./duration";

describe('parseDurationSeconds', () => {
	test('mm:ss and h:mm:ss', () => {
		expect(parseDurationSeconds('3:00')).toBe(180);
		expect(parseDurationSeconds('12:34')).toBe(754);
		expect(parseDurationSeconds('1:20:00')).toBe(4800);
		expect(parseDurationSeconds(' 10:05:09 ')).toBe(36309);
	});

	test('not a duration', () => {
		expect(parseDurationSeconds('')).toBeNull();
		expect(parseDurationSeconds('LIVE')).toBeNull();
		expect(parseDurationSeconds('Premiere')).toBeNull();
		expect(parseDurationSeconds('123')).toBeNull();
	});
});

describe('isTooShort', () => {
	test('0 means off, unknown lengths are never hidden', () => {
		expect(isTooShort(60, 0)).toBe(false);
		expect(isTooShort(null, 15)).toBe(false);
	});

	test('strictly shorter than the minimum', () => {
		expect(isTooShort(180, 15)).toBe(true);
		expect(isTooShort(15 * 60, 15)).toBe(false);
		expect(isTooShort(80 * 60, 60)).toBe(false);
	});
});
