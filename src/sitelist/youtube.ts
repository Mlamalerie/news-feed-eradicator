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
					title: 'Music (official artist channels)',
					type: 'remove',
					paths: '*',
					default: false,
					// Hides any thumbnail whose channel carries the Official Artist Channel
					// badge, which is distinct from the plain verified tick.
					//
					// In the current view-model DOM the badge is NOT a `badge-shape` element:
					// it is a 14x14 icon inlined into the channel name's attributed string,
					// wrapped in `.ytAttributedStringImageElement`. That wrapper is shared
					// with the ordinary verified tick, so the only discriminator is the SVG
					// path data - the OAC badge draws a scalloped rosette starting
					// "M9.03 2.242", the verified tick draws a circle starting "M12 1C5.925".
					// Verified against a live home feed: the rosette matched only music
					// channels, the circle only non-music ones.
					//
					// Never put a comma inside :has() - sanitizeSelector() in the service
					// worker strips commas per-selector, silently turning :has(a, b) into
					// the descendant combinator :has(a b). Use separate entries for "or".
					selectors: [
						'ytd-rich-item-renderer:has(.ytAttributedStringImageElement path[d^="M9.03 2.242"])',
						'yt-lockup-view-model:has(.ytAttributedStringImageElement path[d^="M9.03 2.242"])',
						'ytd-video-renderer:has(.ytAttributedStringImageElement path[d^="M9.03 2.242"])',
						'ytd-compact-video-renderer:has(.ytAttributedStringImageElement path[d^="M9.03 2.242"])',
						// Legacy Polymer DOM, still served on some surfaces. No-op otherwise.
						'ytd-rich-item-renderer:has(.badge-style-type-verified-artist)',
						'ytd-video-renderer:has(.badge-style-type-verified-artist)',
						'ytd-compact-video-renderer:has(.badge-style-type-verified-artist)',
					],
				},
			],
		}

export default site;
