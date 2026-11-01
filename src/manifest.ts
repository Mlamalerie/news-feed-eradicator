import packageJson from '../package.json';

export default {
	"name": packageJson.title,
	"version": packageJson.version,
	"description": packageJson.description,
	"author": "Mlamali The Engineer (Mlamali Said Salimo), based on News Feed Eradicator by Jordan West",
	"homepage_url": "https://github.com/Mlamalerie/news-feed-eradicator",
	"manifest_version": 3,
	"permissions": ["storage", "scripting"],
	"optional_host_permissions": ["*://*/*"],
	"action": {
		"default_icon": {
			"16": "assets/icons/logo-contrast-16.png",
			"32": "assets/icons/logo-contrast-32.png",
			"64": "assets/icons/logo-contrast-64.png",
		},
		"default_title": packageJson.title
	},
	"background": {
		"service_worker": "entrypoints/service-worker/service-worker.js",
		"scripts": ["entrypoints/service-worker/service-worker.js"],
		"type": "module"
	},
	"options_ui": {
		"page": "entrypoints/options-page/index.html",
		"open_in_tab": true,
		"browser_style": false
	},
	"icons": {
		"16": "assets/icon16.png",
		"32": "assets/icon32.png",
		"48": "assets/icon48.png",
		"64": "assets/icon64.png",
		"128": "assets/icon128.png"
	},
	"web_accessible_resources": [
		{
			"resources": ["sitelist.json", "entrypoints/intercept/intercept.js"],
			"extension_ids": [],
		}
	],
	"browser_specific_settings": {
		"gecko": {
			"id": "@silent-feed"
		},
		"gecko_android": {
			"strict_min_version": "113.0"
		}
	}
}
