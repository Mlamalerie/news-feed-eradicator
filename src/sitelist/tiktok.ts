import { regionId, siteId, type Site } from "../types/sitelist";

// NOTE: TikTok's markup is obfuscated and changes often. The selectors below are best-effort
// and were NOT verified against the live site when written - if a region does nothing, inspect
// the page and update the selectors. Videos opened from a shared link (/@user/video/123) are
// deliberately left alone, so you can still watch something a friend sent you.
export const site: Site = {
	id: siteId('tiktok'),
	title: 'TikTok',
	hosts: ['www.tiktok.com'],
	paths: ['/', '/foryou', '/following', '/explore', '/live'],
	regions: [
		{
			id: regionId('feed'),
			title: 'Video feeds (For You, Following, Explore, Live)',
			type: 'hide',
			paths: 'inherit',
			selectors: [
				'div[id^="main-content-homepage_hot"]',
				'div[id^="main-content-homepage_following"]',
				'div[id^="main-content-explore_page"]',
				'div[id^="main-content-live"]',
				'main',
			],
			inject: {
				mode: 'overlay-fixed',
				overlayZIndex: 2000,
			},
		},
		{
			id: regionId('suggested-accounts'),
			title: 'Suggested accounts in the sidebar',
			type: 'remove',
			paths: '*',
			selectors: [
				'div[data-e2e="recommend-list-item-container"]:has(a[href^="/@"]) ~ div',
				'div[data-e2e="suggest-accounts"]',
				'div[data-e2e="recommended-accounts"]',
			],
		},
	],
};

export default site;
