import { createResource, createSignal, For, onCleanup, Show } from "solid-js";
import { clearStats, loadStats, loadUsage } from "/storage/storage";
import { dateKey } from "/lib/blocks";
import { SiteLogo } from "/shared/components/site-logo";
import { daysAgo, dayTotal, type Stats } from "/lib/stats";
import { useOptionsPageState } from "../../state";

const KIND_LABEL: Record<string, string> = {
	music: 'music videos and shelves hidden',
	feed: 'feeds replaced by a quote',
};

const shortDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });

export const StatsTabContent = () => {
	const state = useOptionsPageState();
	const [stats, { refetch }] = createResource<Stats>(loadStats);
	const [usage, { refetch: refetchUsage }] = createResource(loadUsage);
	const [confirmReset, setConfirmReset] = createSignal(false);

	// Counts arrive while this page is open (from other tabs), so keep it fresh
	const timer = setInterval(() => { refetch(); refetchUsage(); }, 3000);
	onCleanup(() => clearInterval(timer));

	const siteTitle = (id: string) => state.siteList.get()?.sites.find(s => s.id === id)?.title ?? id;

	return <Show when={stats()}>{s => {
		const days = () => Array.from({ length: 7 }, (_, i) => daysAgo(6 - i)).map(d => ({ date: d, total: dayTotal(s()[d]) }));
		const max = () => Math.max(1, ...days().map(d => d.total));
		const today = () => dayTotal(s()[daysAgo(0)]);
		const last30 = () => {
			const totals: Record<string, number> = {};
			for (let i = 0; i < 30; i++) {
				for (const [key, n] of Object.entries(s()[daysAgo(i)] ?? {})) totals[key] = (totals[key] ?? 0) + n;
			}
			return Object.entries(totals).sort((a, b) => b[1] - a[1]);
		};
		const total30 = () => last30().reduce((a, [, n]) => a + n, 0);

		return <div class="p-8 space-y-4">
			<div class="text-center space-y-1">
				<div style={{ "font-size": '56px', "line-height": 1 }} class="font-bold">{today()}</div>
				<div class="text-secondary">hidden today</div>
			</div>

			<div class="flex gap-2" style={{ "align-items": 'flex-end', height: '120px' }}>
				<For each={days()}>{d => <div class="flex flex-col cross-center" style={{ flex: 1, height: '100%', "justify-content": 'flex-end' }}>
					<span class="font-xs text-secondary">{d.total || ''}</span>
					<div style={{ width: '100%', "max-width": '48px', height: `${Math.max(2, (d.total / max()) * 80)}px`, background: 'var(--theme-accent)', "border-radius": '4px 4px 0 0', opacity: d.total ? 1 : 0.25 }} />
					<span class="font-xs text-secondary">{shortDay(d.date)}</span>
				</div>}</For>
			</div>

			<div>
				<h4 class="font-bold">Time on sites today</h4>
				{(() => {
					const rows = () => Object.entries(usage()?.[dateKey(new Date())] ?? {})
						.map(([site, hours]) => [site, Math.round(hours.reduce((a, b) => a + (b ?? 0), 0) / 60)] as const)
						.filter(([, min]) => min > 0)
						.sort((a, b) => b[1] - a[1]);
					const fmt = (min: number) => min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
					return <Show when={rows().length > 0} fallback={<p class="text-secondary font-xs">No time recorded yet today.</p>}>
						<ul class="space-y-1 py-2">
							<For each={rows()}>{([site, min]) => <li class="flex cross-center gap-2"><SiteLogo siteId={site} size={18} /><span class="flex-1">{siteTitle(site)}</span><span class="font-bold">{fmt(min)}</span></li>}</For>
						</ul>
					</Show>;
				})()}
			</div>

			<div>
				<h4 class="font-bold">Last 30 days: {total30()}</h4>
				<Show when={last30().length > 0} fallback={<p class="text-secondary font-xs">Nothing yet. Counts appear as you browse sites that are switched on.</p>}>
					<ul class="space-y-1 py-2">
						<For each={last30()}>{([key, n]) => {
							const [site, kind] = key.split(':');
							return <li class="flex"><span class="flex-1">{siteTitle(site!)}: {KIND_LABEL[kind!] ?? kind}</span><span class="font-bold">{n}</span></li>;
						}}</For>
					</ul>
				</Show>
			</div>

			<p class="text-secondary font-xs">Counts stay on this device. Music is counted once per distinct video or shelf per page load; a feed is counted once per page where it was replaced. Time on sites counts only while the site is the visible, focused tab. The number on the toolbar icon is today's total of hidden items.</p>

			<div class="text-center">
				<button class="secondary" onClick={async () => {
					if (!confirmReset()) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
					await clearStats(); setConfirmReset(false); refetch();
				}}>{confirmReset() ? 'Click again to erase' : 'Reset statistics'}</button>
			</div>
		</div>;
	}}</Show>;
};
