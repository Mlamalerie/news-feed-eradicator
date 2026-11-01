import { createResource, Show } from "solid-js";
import { loadMusicFilter, saveMusicFilter } from "/storage/storage";
import { sendToServiceWorker } from "/messaging/messages";
import { parseList, type MusicFilterSettings, type MusicSurface } from "/lib/music-filter";
import { useOptionsPageState } from "../../state";

type DetectKey = keyof MusicFilterSettings['detect'];

const DETECTORS: { key: DetectKey, label: string, help: string }[] = [
	{ key: 'officialArtist', label: 'Official artist channels', help: 'Channels with the music-note rosette badge.' },
	{ key: 'topic', label: '"Artist - Topic" channels', help: 'Auto-generated channels that host album tracks.' },
	{ key: 'mixes', label: 'Mixes and album playlists', help: 'YouTube\'s auto-generated "Mix" and album playlists.' },
	{ key: 'keywords', label: 'Music video titles', help: '"Official Music Video", "Lyric Video", "(Audio)", "Clip officiel", "Full album"...' },
	{ key: 'shelves', label: 'Music shelves on the home page', help: 'Shelves titled "Music", "Mix", "Musique"...' },
];

const SURFACES: { key: MusicSurface, label: string }[] = [
	{ key: 'home', label: 'Home page' },
	{ key: 'search', label: 'Search results' },
	{ key: 'watch', label: 'Suggestions next to a video' },
	{ key: 'other', label: 'Everywhere else (subscriptions, channel pages, playlists, history)' },
];

export const YoutubeMusicSettings = () => {
	const state = useOptionsPageState();
	const [settings, { mutate }] = createResource(loadMusicFilter);

	const update = async (change: (s: MusicFilterSettings) => MusicFilterSettings) => {
		const current = settings();
		if (current == null) return;
		const next = change(structuredClone(current));
		mutate(next);
		await saveMusicFilter(next);
		await sendToServiceWorker({ type: 'notifyOptionsUpdated' });
	};

	return <Show when={settings()}>{s => <div class="py-4 space-y-2">
		<div class="px-4">
			<h4 class="font flex-1 text-figure-500 font-bold">Music filter</h4>
			<p class="font-xs text-secondary">Applies when the "Music" region above is on.</p>
		</div>

		<div class="px-4"><h5 class="font-xs text-secondary font-bold">What counts as music</h5></div>
		{DETECTORS.map(d => <label class="flex cross-center cursor-pointer hoverable px-4">
			<input type="checkbox" class="toggle" disabled={state.settingsLockedDown()}
				checked={s().detect[d.key]}
				onChange={e => update(v => { v.detect[d.key] = e.currentTarget.checked; return v; })} />
			<span class="flex-1 px-2 py-1">
				<span class="block">{d.label}</span>
				<span class="block font-xs text-secondary">{d.help}</span>
			</span>
		</label>)}

		<div class="px-4 pt-2"><h5 class="font-xs text-secondary font-bold">Where to hide it</h5></div>
		{SURFACES.map(surface => <label class="flex cross-center cursor-pointer hoverable px-4">
			<input type="checkbox" class="toggle" disabled={state.settingsLockedDown()}
				checked={s().surfaces[surface.key]}
				onChange={e => update(v => { v.surfaces[surface.key] = e.currentTarget.checked; return v; })} />
			<span class="flex-1 px-2 py-1">{surface.label}</span>
		</label>)}

		<div class="px-4 pt-2 space-y-1">
			<label class="block font-xs text-secondary font-bold" for="music-allow">Never hide these channels</label>
			<textarea id="music-allow" class="w-full" rows="4" disabled={state.settingsLockedDown()}
				placeholder="One channel name per line"
				value={s().allowChannels.join('\n')}
				onChange={e => update(v => { v.allowChannels = parseList(e.currentTarget.value); return v; })} />
			<p class="font-xs text-secondary">Case and accents are ignored. "Daft Punk" also keeps "Daft Punk - Topic".</p>
		</div>

		<div class="px-4 pt-2 space-y-1">
			<label class="block font-xs text-secondary font-bold" for="music-block">Also hide titles containing</label>
			<textarea id="music-block" class="w-full" rows="4" disabled={state.settingsLockedDown()}
				placeholder="One word or phrase per line, e.g. remix"
				value={s().blockKeywords.join('\n')}
				onChange={e => update(v => { v.blockKeywords = parseList(e.currentTarget.value); return v; })} />
		</div>
	</div>}</Show>;
};
