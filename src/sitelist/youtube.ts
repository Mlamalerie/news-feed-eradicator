import { type Site, siteId, regionId } from "../types/sitelist";

export const site: Site = {
			id: siteId('youtube'),
			title: 'YouTube',
			hosts: ['www.youtube.com', 'youtube.com'],
			paths: ['/', '/gaming', '/podcasts'],
			regions: [
				{
					id: regionId('feed'),
					title: 'Main feed',
					selectors: ['ytd-browse'],
					paths: 'inherit',
					type: 'hide',
					inject: {
						mode: 'overlay-fixed',
						overlayZIndex: 2019,
					},
				},
				{
					id: regionId('shorts-button'),
					title: 'Shorts button',
					type: 'remove',
					paths: '*',
					selectors: ['ytd-guide-entry-renderer:has(a[title="Shorts"])', 'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])'],
				},
				{
					id: regionId('shorts-content'),
					title: 'Shorts videos and shelves',
					type: 'remove',
					paths: '*',
					// NOTE: selectors are scoped by an ancestor rather than by `paths` because
					// YouTube is a SPA - ancestor guards update instantly, path matching lags
					// behind the 15ms pathname poll in the content script.
					selectors: [
						// Shorts shelf on the home and subscriptions feeds
						'[page-subtype="home"] ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
						'[page-subtype="home"] ytd-rich-section-renderer:has(.shortsLockupViewModelHost)',
						'[page-subtype="subscriptions"] ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
						'[page-subtype="subscriptions"] ytd-rich-section-renderer:has(.shortsLockupViewModelHost)',
						// Individual Shorts that appear inline in the home grid
						'ytd-rich-item-renderer:has(.shortsLockupViewModelHost)',
						// Search results: horizontal shelf, new-style grid, standalone thumbnails
						'ytd-search ytd-reel-shelf-renderer',
						'ytd-search grid-shelf-view-model:has(.shortsLockupViewModelHost)',
						// aria-label is localised, so the href variant below is what actually
						// carries non-English UIs - keep both.
						'ytd-search ytd-video-renderer:has(badge-shape[aria-label="Shorts"])',
						'ytd-search ytd-video-renderer:has(a[href^="/shorts/"])',
						// Watch page sidebar
						'#secondary ytd-compact-video-renderer:has(a[href^="/shorts/"])',
					],
				},
				{
					id: regionId('explore-nav'),
					title: 'Explore navigation menu',
					type: 'remove',
					paths: '*',
					selectors: ['ytd-guide-section-renderer:nth-child(4)']
				},
				{
					id: regionId('end-screen-suggested'),
					title: 'End screen suggested videos',
					paths: '*',
					type: 'remove',
					selectors: ['.ytp-fullscreen-grid'],
				},
				{
					id: regionId('sidebar-suggested'),
					title: 'Suggested videos sidebar',
					type: 'hide',
					paths: '*',
					selectors: ['ytd-watch-next-secondary-results-renderer'],
				},
				{
					id: regionId('comments'),
					title: 'Video comments',
					type: 'hide',
					paths: '*',
					selectors: ['ytd-comments'],
					default: false,
				},
				{
					id: regionId('live-chat'),
					title: 'Live chat',
					type: 'hide',
					paths: '*',
					selectors: ['ytd-live-chat-frame'],
					default: false,
				},
				{
					id: regionId('notifications'),
					title: 'Notifications',
					type: 'remove',
					paths: '*',
					selectors: ['ytd-notification-topbar-button-renderer'],
					default: false,
				},
				{
					id: regionId('subscriptions'),
					title: 'Subscriptions',
					type: 'remove',
					paths: '*',
					selectors: [
						'ytd-guide-section-renderer:nth-child(2)',
						'ytd-mini-guide-renderer:nth-child(2)'
					],
					default: false,
				},
				{
					id: regionId('artist-channels'),
					title: 'Music (artist channels, mixes, music videos)',
					type: 'remove',
					paths: '*',
					// This region is the master switch for the music filter. Detection that needs
					// to read text (Official Artist badge, "- Topic" channels, Mixes, title
					// keywords, the allow list) lives in the content script - see
					// entrypoints/intercept/music-scanner.ts and lib/music-filter.ts. Settings are in
					// the options page under Sites > YouTube.
					//
					// The CSS below only covers static navigation links to YouTube Music.
					//
					// Never put a comma inside :has() - sanitizeSelector() in the service
					// worker strips commas per-selector, silently turning :has(a, b) into
					// the descendant combinator :has(a b). Use separate entries for "or".
					selectors: [
						'ytd-guide-entry-renderer:has(a[href*="music.youtube.com"])',
						'ytd-mini-guide-entry-renderer:has(a[href*="music.youtube.com"])',
						'ytd-guide-entry-renderer:has(a[title="YouTube Music"])',
					],
				},
			],
		}

export default site;
