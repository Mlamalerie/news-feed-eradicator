import {
	cardKey,
	classifyCard,
	defaultMusicFilterSettings,
	shouldHideShelf,
	surfaceForPath,
	type CardInfo,
	type MusicFilterSettings,
} from '../../lib/music-filter';
import { isTooShort, parseDurationSeconds } from '../../lib/duration';

/**
 * Hides music on YouTube by scanning video cards and tagging the ones classified as music with
 * a data attribute. Pure CSS selectors can't match on text (Topic channels, keywords, an allow
 * list), which is why this exists alongside the CSS regions in sitelist/youtube.ts.
 *
 * YouTube recycles card elements as you scroll and navigate, so every card is re-evaluated when
 * anything inside it changes, and the attribute is removed again if it no longer qualifies.
 */

const HIDDEN_ATTR = 'data-nfe-music-hidden';
const STYLE_ID = 'nfe-music-style';

const OUTER_CARD_SELECTOR = 'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer';
// yt-lockup-view-model is the newer card type and is usually nested in one of the above
const CARD_SELECTOR = `${OUTER_CARD_SELECTOR}, yt-lockup-view-model`;
const SHELF_SELECTOR = 'ytd-rich-section-renderer';

// The Official Artist Channel badge is drawn as an inline SVG rosette. It shares its wrapper
// class with the plain verified tick, so the path data is the only discriminator.
const ARTIST_BADGE_SELECTOR = '.ytAttributedStringImageElement path[d^="M9.03 2.242"], .badge-style-type-verified-artist';

const TITLE_SELECTORS = ['#video-title', '.yt-lockup-metadata-view-model__title', 'h3'];
const CHANNEL_SELECTORS = ['ytd-channel-name', '#channel-name', '.yt-content-metadata-view-model__metadata-text'];
const SHELF_TITLE_SELECTORS = ['#title', 'h2'];
const DURATION_SELECTORS = ['ytd-thumbnail-overlay-time-status-renderer', 'yt-thumbnail-badge-view-model', '.yt-badge-shape__text'];

const SWEEP_INTERVAL_MS = 1500;

const outerCard = (el: Element): Element => el.closest(OUTER_CARD_SELECTOR) ?? el;

const firstText = (root: Element, selectors: string[]): string => {
	for (const selector of selectors) {
		const text = root.querySelector(selector)?.textContent?.trim();
		if (text) return text;
	}
	return '';
};

export const extractCardInfo = (card: Element): CardInfo => ({
	title: firstText(card, TITLE_SELECTORS),
	channel: firstText(card, CHANNEL_SELECTORS),
	text: card.textContent ?? '',
	hrefs: Array.from(card.querySelectorAll('a[href]'), a => a.getAttribute('href') ?? ''),
	hasArtistBadge: card.querySelector(ARTIST_BADGE_SELECTOR) != null,
	durationText: firstText(card, DURATION_SELECTORS),
});

export class MusicScanner {
	private active = false;
	private settings: MusicFilterSettings = defaultMusicFilterSettings();
	private observer?: MutationObserver;
	private sweepTimer?: ReturnType<typeof setInterval>;
	private dirty = new Set<Element>();
	private flushScheduled = false;
	private styleEl?: HTMLStyleElement;
	private onNavigate = () => this.scanAll();

	// Distinct items hidden since the page loaded, so recycled cards and re-scans aren't counted twice
	private seen = new Set<string>();
	private pending: Record<'music' | 'short', number> = { music: 0, short: 0 };
	private reportTimer?: ReturnType<typeof setTimeout>;

	/** onHidden is called (batched) with the number of newly hidden items. */
	constructor(private onHidden: (kind: 'music' | 'short', count: number) => void = () => {}) {}

	private musicEnabled = true;

	private countNew(key: string, kind: 'music' | 'short') {
		if (this.seen.has(key)) return;
		this.seen.add(key);
		this.pending[kind]++;
		this.reportTimer ??= setTimeout(() => {
			const counts = this.pending;
			this.pending = { music: 0, short: 0 };
			this.reportTimer = undefined;
			for (const k of ['music', 'short'] as const) if (counts[k] > 0) this.onHidden(k, counts[k]);
		}, 1500);
	}

	/** Turn the scanner on or off and give it the latest settings. Safe to call repeatedly. */
	update({ active, settings, musicEnabled }: { active: boolean; settings: MusicFilterSettings; musicEnabled: boolean }) {
		this.settings = settings;
		this.musicEnabled = musicEnabled;
		this.active = active;

		if (active) {
			this.start();
			this.scanAll();
		} else {
			this.stop();
			this.clearAll();
		}
	}

	private start() {
		this.ensureStyle();

		if (this.observer == null) {
			this.observer = new MutationObserver(mutations => this.onMutations(mutations));
			this.observer.observe(document.documentElement, {
				subtree: true,
				childList: true,
				characterData: true,
				attributes: true,
				attributeFilter: ['href'],
			});
			window.addEventListener('yt-navigate-finish', this.onNavigate);
		}

		// Safety net for anything the observer misses
		this.sweepTimer ??= setInterval(() => this.scanAll(), SWEEP_INTERVAL_MS);
	}

	private stop() {
		this.observer?.disconnect();
		this.observer = undefined;
		window.removeEventListener('yt-navigate-finish', this.onNavigate);
		if (this.sweepTimer != null) clearInterval(this.sweepTimer);
		this.sweepTimer = undefined;
		this.dirty.clear();
	}

	private ensureStyle() {
		if (this.styleEl?.isConnected) return;
		this.styleEl = document.createElement('style');
		this.styleEl.id = STYLE_ID;
		this.styleEl.textContent = `[${HIDDEN_ATTR}] { display: none !important; }`;
		(document.head ?? document.documentElement).appendChild(this.styleEl);
	}

	private clearAll() {
		for (const el of document.querySelectorAll(`[${HIDDEN_ATTR}]`)) {
			el.removeAttribute(HIDDEN_ATTR);
		}
		this.styleEl?.remove();
		this.styleEl = undefined;
	}

	private onMutations(mutations: MutationRecord[]) {
		for (const m of mutations) {
			const target = m.target instanceof Element ? m.target : m.target.parentElement;
			const card = target?.closest(CARD_SELECTOR);
			if (card != null) this.dirty.add(outerCard(card));
			const shelf = target?.closest(SHELF_SELECTOR);
			if (shelf != null) this.dirty.add(shelf);

			for (const node of m.addedNodes) {
				if (!(node instanceof Element)) continue;
				if (node.matches(CARD_SELECTOR)) this.dirty.add(outerCard(node));
				if (node.matches(SHELF_SELECTOR)) this.dirty.add(node);
				for (const c of node.querySelectorAll(CARD_SELECTOR)) this.dirty.add(outerCard(c));
				for (const s of node.querySelectorAll(SHELF_SELECTOR)) this.dirty.add(s);
			}
		}

		// A microtask runs before the next paint, so newly inserted music is hidden without a flash
		if (this.dirty.size > 0 && !this.flushScheduled) {
			this.flushScheduled = true;
			queueMicrotask(() => {
				this.flushScheduled = false;
				const batch = Array.from(this.dirty);
				this.dirty.clear();
				for (const el of batch) this.evaluate(el);
			});
		}
	}

	private scanAll() {
		if (!this.active) return;
		const elements = new Set<Element>();
		for (const c of document.querySelectorAll(CARD_SELECTOR)) elements.add(outerCard(c));
		for (const s of document.querySelectorAll(SHELF_SELECTOR)) elements.add(s);
		for (const el of elements) this.evaluate(el);
	}

	private evaluate(el: Element) {
		if (!this.active || !el.isConnected) return;

		const surface = surfaceForPath(window.location.pathname);
		let hide = false;
		let kind: 'music' | 'short' = 'music';
		let key = '';
		if (el.matches(SHELF_SELECTOR)) {
			const title = firstText(el, SHELF_TITLE_SELECTORS);
			hide = this.musicEnabled && shouldHideShelf(title, this.settings, surface);
			key = `shelf:${title}`;
		} else {
			const info = extractCardInfo(el);
			key = cardKey(info);
			if (this.musicEnabled && classifyCard(info, this.settings, surface).hide) {
				hide = true;
				kind = 'music';
			} else if (this.settings.surfaces[surface] && isTooShort(parseDurationSeconds(info.durationText ?? ''), this.settings.minDurationMin)) {
				hide = true;
				kind = 'short';
			}
		}

		if (hide !== el.hasAttribute(HIDDEN_ATTR)) {
			if (hide) {
				el.setAttribute(HIDDEN_ATTR, '');
				this.countNew(key, kind);
			} else {
				el.removeAttribute(HIDDEN_ATTR);
			}
		}
	}
}
