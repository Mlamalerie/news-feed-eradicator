/**
 * Pure (DOM-free) logic for the YouTube music filter, so it can be unit tested.
 * The DOM side lives in entrypoints/intercept/music-scanner.ts.
 */

export type MusicSurface = 'home' | 'search' | 'watch' | 'other';

export type MusicFilterSettings = {
	detect: {
		/** Channels carrying the Official Artist Channel badge */
		officialArtist: boolean;
		/** Auto-generated "Artist - Topic" channels */
		topic: boolean;
		/** YouTube Mixes (list=RD...) and auto-generated album playlists (list=OLAK5uy...) */
		mixes: boolean;
		/** Built-in title patterns such as "Official Music Video", "(Lyrics)", "Clip officiel" */
		keywords: boolean;
		/** Home shelves titled "Music", "Mix", "Musique"... */
		shelves: boolean;
	};
	/** Where the filter is applied. "other" covers subscriptions, channel pages, history, playlists... */
	surfaces: Record<MusicSurface, boolean>;
	/** Channels that are never hidden (substring match, case and accent insensitive) */
	allowChannels: string[];
	/** Extra words/phrases that hide a video when found in its title (case and accent insensitive) */
	blockKeywords: string[];
};

export const defaultMusicFilterSettings = (): MusicFilterSettings => ({
	detect: {
		officialArtist: true,
		topic: true,
		mixes: true,
		keywords: true,
		shelves: true,
	},
	surfaces: {
		home: true,
		search: true,
		watch: true,
		// Hiding music from channels you deliberately subscribed to or from your own playlists
		// would be surprising, so this is opt-in.
		other: false,
	},
	allowChannels: [],
	blockKeywords: [],
});

export type CardInfo = {
	/** Video title, if it could be located */
	title: string;
	/** Channel name, if it could be located */
	channel: string;
	/** Whole text content of the card, used as a fallback when title/channel are not found */
	text: string;
	/** href of every link inside the card */
	hrefs: string[];
	/** True if the card shows the Official Artist Channel badge */
	hasArtistBadge: boolean;
};

export type MusicVerdict =
	| { hide: false; reason: 'disabled-surface' | 'allowed' | 'not-music' }
	| { hide: true; reason: 'artist-badge' | 'topic' | 'mix' | 'custom-keyword' | 'keyword' };

/** Lowercase, strip accents, collapse whitespace. Both patterns and input go through this. */
export const normalize = (s: string): string =>
	s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const surfaceForPath = (pathname: string): MusicSurface => {
	if (pathname === '/') return 'home';
	if (pathname === '/results') return 'search';
	if (pathname === '/watch') return 'watch';
	return 'other';
};

// All patterns run against normalize()d text, so they are written lowercase and without accents.
const BUILTIN_KEYWORD_PATTERNS: RegExp[] = [
	/\bofficial (?:music |lyric |audio )?video\b(?! games?\b)/,
	/\bofficial audio\b/,
	/\blyric video\b/,
	/\bvisuali[sz]er\b/,
	/[\[(]\s*(?:official )?(?:lyrics?|audio|paroles?)\s*[\])]/,
	/\bclip officiel\b/,
	/\bvideo officielle\b/,
	/\baudio officiel\b/,
	/\bfull album\b/,
	/\balbum complet\b/,
];

const TOPIC_PATTERN = /(?:^| )- topic\b/;
const MIX_HREF_PATTERN = /[?&]list=(?:RD|OLAK5uy)/;
const SHELF_TITLE_PATTERN = /\b(?:music|musique|mix|mixes)\b/;

const includesAny = (haystack: string, needles: string[]): boolean =>
	needles.some(n => {
		const needle = normalize(n);
		return needle.length > 0 && haystack.includes(needle);
	});

export const classifyCard = (card: CardInfo, settings: MusicFilterSettings, surface: MusicSurface): MusicVerdict => {
	if (!settings.surfaces[surface]) {
		return { hide: false, reason: 'disabled-surface' };
	}

	const title = normalize(card.title || card.text);
	const channel = normalize(card.channel || card.text);

	if (includesAny(channel, settings.allowChannels)) {
		return { hide: false, reason: 'allowed' };
	}

	if (settings.detect.officialArtist && card.hasArtistBadge) {
		return { hide: true, reason: 'artist-badge' };
	}

	if (settings.detect.topic && TOPIC_PATTERN.test(channel)) {
		return { hide: true, reason: 'topic' };
	}

	if (settings.detect.mixes && card.hrefs.some(href => MIX_HREF_PATTERN.test(href))) {
		return { hide: true, reason: 'mix' };
	}

	if (includesAny(title, settings.blockKeywords)) {
		return { hide: true, reason: 'custom-keyword' };
	}

	if (settings.detect.keywords && BUILTIN_KEYWORD_PATTERNS.some(p => p.test(title))) {
		return { hide: true, reason: 'keyword' };
	}

	return { hide: false, reason: 'not-music' };
};

export const shouldHideShelf = (shelfTitle: string, settings: MusicFilterSettings, surface: MusicSurface): boolean => {
	if (!settings.surfaces[surface] || !settings.detect.shelves) return false;
	return SHELF_TITLE_PATTERN.test(normalize(shelfTitle));
};

/// Settings persistence helpers

const MAX_LIST_ITEMS = 200;
const MAX_ITEM_LENGTH = 100;

/** One entry per line, trimmed, de-duplicated, capped. */
export const parseList = (text: string): string[] => {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const line of text.split(/\r?\n/)) {
		const item = line.trim().slice(0, MAX_ITEM_LENGTH);
		const key = normalize(item);
		if (key.length === 0 || seen.has(key)) continue;
		seen.add(key);
		out.push(item);
		if (out.length >= MAX_LIST_ITEMS) break;
	}
	return out;
};

const asBool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const asList = (v: unknown): string[] => (Array.isArray(v) ? parseList(v.filter(x => typeof x === 'string').join('\n')) : []);

/** Accepts anything read from storage and returns a complete, valid settings object. */
export const sanitizeMusicFilter = (raw: unknown): MusicFilterSettings => {
	const d = defaultMusicFilterSettings();
	if (raw == null || typeof raw !== 'object') return d;
	const r = raw as Partial<Record<keyof MusicFilterSettings, any>>;

	return {
		detect: {
			officialArtist: asBool(r.detect?.officialArtist, d.detect.officialArtist),
			topic: asBool(r.detect?.topic, d.detect.topic),
			mixes: asBool(r.detect?.mixes, d.detect.mixes),
			keywords: asBool(r.detect?.keywords, d.detect.keywords),
			shelves: asBool(r.detect?.shelves, d.detect.shelves),
		},
		surfaces: {
			home: asBool(r.surfaces?.home, d.surfaces.home),
			search: asBool(r.surfaces?.search, d.surfaces.search),
			watch: asBool(r.surfaces?.watch, d.surfaces.watch),
			other: asBool(r.surfaces?.other, d.surfaces.other),
		},
		allowChannels: asList(r.allowChannels),
		blockKeywords: asList(r.blockKeywords),
	};
};

/**
 * Stable identity of a card, so the same video is only counted once even if YouTube re-renders it.
 * Uses the video id or playlist id from the links, else falls back to title + channel.
 */
export const cardKey = (card: CardInfo): string => {
	for (const href of card.hrefs) {
		const m = /[?&]v=([\w-]{6,})|[?&]list=([\w-]+)/.exec(href);
		if (m) return m[1] ?? m[2]!;
	}
	return `${normalize(card.title)}|${normalize(card.channel)}`.slice(0, 160);
};
