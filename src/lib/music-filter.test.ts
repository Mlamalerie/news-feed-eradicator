import { describe, expect, test } from "bun:test";
import { classifyCard, defaultMusicFilterSettings, normalize, parseList, sanitizeMusicFilter, shouldHideShelf, surfaceForPath, type CardInfo } from "./music-filter";

const card = (over: Partial<CardInfo> = {}): CardInfo => ({
	title: 'How to bake bread', channel: 'Baker Bob', text: 'How to bake bread Baker Bob 1M views', hrefs: ['/watch?v=abc'], hasArtistBadge: false, ...over,
});

describe('classifyCard', () => {
	const s = defaultMusicFilterSettings();

	test('leaves ordinary videos alone', () => {
		expect(classifyCard(card(), s, 'home')).toEqual({ hide: false, reason: 'not-music' });
	});

	test('official artist badge', () => {
		expect(classifyCard(card({ hasArtistBadge: true }), s, 'home').hide).toBe(true);
	});

	test('topic channels, with and without a located channel element', () => {
		expect(classifyCard(card({ channel: 'Daft Punk - Topic' }), s, 'home')).toEqual({ hide: true, reason: 'topic' });
		expect(classifyCard(card({ channel: '', text: 'Around the World Daft Punk - Topic 3M views' }), s, 'home').hide).toBe(true);
	});

	test('mixes and album playlists, but not plain videos', () => {
		expect(classifyCard(card({ hrefs: ['/watch?v=abc&list=RDabc&start_radio=1'] }), s, 'home').reason).toBe('mix');
		expect(classifyCard(card({ hrefs: ['/playlist?list=OLAK5uy_xyz'] }), s, 'search').reason).toBe('mix');
		expect(classifyCard(card({ hrefs: ['/watch?v=abc&list=PLabc'] }), s, 'home').hide).toBe(false);
	});

	test.each([
		'Artist - Song (Official Music Video)',
		'Artist - Song [Official Audio]',
		'Artist - Song (Lyrics)',
		'Artist - Song (Official Lyric Video)',
		'Artist - Chanson (Clip Officiel)',
		'Artist - Chanson (Vidéo Officielle)',
		'Artist - Chanson (Paroles)',
		'Artist - Album (Full Album)',
		'Artist - Album complet',
		'Song visualizer',
	])('built-in title pattern: %s', title => {
		expect(classifyCard(card({ title }), s, 'home').hide).toBe(true);
	});

	test.each([
		'How to write song lyrics',
		'Making a music video: behind the scenes tutorial',
		'Official video game trailer',
	])('does not over-match: %s', title => {
		expect(classifyCard(card({ title }), s, 'home').hide).toBe(false);
	});

	test('custom keywords ignore case and accents', () => {
		const custom = { ...s, blockKeywords: ['Rémix'] };
		expect(classifyCard(card({ title: 'Song (REMIX 2026)' }), custom, 'home').reason).toBe('custom-keyword');
	});

	test('allow list beats every detector', () => {
		const allow = { ...s, allowChannels: ['daft punk'] };
		const c = card({ channel: 'Daft Punk - Topic', hasArtistBadge: true, hrefs: ['/watch?v=a&list=RDa'], title: 'Song (Official Music Video)' });
		expect(classifyCard(c, allow, 'home')).toEqual({ hide: false, reason: 'allowed' });
	});

	test('surfaces: other is off by default, and turning one off disables filtering there', () => {
		const c = card({ hasArtistBadge: true });
		expect(classifyCard(c, s, 'other')).toEqual({ hide: false, reason: 'disabled-surface' });
		const noSearch = { ...s, surfaces: { ...s.surfaces, search: false } };
		expect(classifyCard(c, noSearch, 'search').hide).toBe(false);
		expect(classifyCard(c, noSearch, 'home').hide).toBe(true);
	});

	test('individual detectors can be switched off', () => {
		const off = { ...s, detect: { ...s.detect, topic: false } };
		expect(classifyCard(card({ channel: 'X - Topic' }), off, 'home').hide).toBe(false);
	});
});

describe('shelves', () => {
	const s = defaultMusicFilterSettings();
	test('matches music-ish shelf titles only', () => {
		expect(shouldHideShelf('Musique', s, 'home')).toBe(true);
		expect(shouldHideShelf('Mixes for you', s, 'home')).toBe(true);
		expect(shouldHideShelf('Latest from your subscriptions', s, 'home')).toBe(false);
		expect(shouldHideShelf('', s, 'home')).toBe(false);
	});
});

describe('helpers', () => {
	test('surfaceForPath', () => {
		expect(surfaceForPath('/')).toBe('home');
		expect(surfaceForPath('/results')).toBe('search');
		expect(surfaceForPath('/watch')).toBe('watch');
		expect(surfaceForPath('/feed/subscriptions')).toBe('other');
		expect(surfaceForPath('/@somebody')).toBe('other');
	});

	test('normalize', () => {
		expect(normalize('  Vidéo   OFFICIELLE ')).toBe('video officielle');
	});

	test('parseList trims, dedupes (accent/case insensitive) and drops blanks', () => {
		expect(parseList(' A \n\n a\nÁ\r\nB ')).toEqual(['A', 'B']);
	});

	test('sanitizeMusicFilter survives garbage and partial data', () => {
		expect(sanitizeMusicFilter(undefined)).toEqual(defaultMusicFilterSettings());
		expect(sanitizeMusicFilter('nope')).toEqual(defaultMusicFilterSettings());
		const partial = sanitizeMusicFilter({ detect: { topic: false }, allowChannels: ['x', 3, null], surfaces: 'bad' });
		expect(partial.detect.topic).toBe(false);
		expect(partial.detect.mixes).toBe(true);
		expect(partial.allowChannels).toEqual(['x']);
		expect(partial.surfaces.other).toBe(false);
	});
});
