import { createResource, createSignal, For, onCleanup, Show } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { loadBlocks, loadUsage, saveBlocks } from "/storage/storage";
import { evaluateBlock, isLocked, newBlock, parseHM, remaining, sanitizeBlock, type Block, type BlockStatus, type Usage } from "/lib/blocks";
import { generateId } from "/lib/generate-id";
import { sendToServiceWorker } from "/messaging/messages";
import { SiteLogo } from "/shared/components/site-logo";
import { useOptionsPageState } from "../../state";

// Display order Monday first, values are Date.getDay()
const DAYS: { value: number, label: string, long: string }[] = [
	{ value: 1, label: 'M', long: 'Monday' }, { value: 2, label: 'T', long: 'Tuesday' }, { value: 3, label: 'W', long: 'Wednesday' },
	{ value: 4, label: 'T', long: 'Thursday' }, { value: 5, label: 'F', long: 'Friday' }, { value: 6, label: 'S', long: 'Saturday' },
	{ value: 0, label: 'S', long: 'Sunday' },
];

const REASON: Record<BlockStatus['reason'], string> = { schedule: 'schedule', daily: 'daily limit reached', hourly: 'hourly limit reached' };

const time = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const daysSummary = (days: number[]) => {
	const set = new Set(days);
	if (set.size === 7) return 'Every day';
	if (set.size === 5 && [1, 2, 3, 4, 5].every(d => set.has(d))) return 'Weekdays';
	if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends';
	return DAYS.filter(d => set.has(d.value)).map(d => d.long.slice(0, 3)).join(', ');
};

export const BlocksTabContent = () => {
	const state = useOptionsPageState();
	const [data, { refetch }] = createResource(async () => {
		const [blocks, usage] = await Promise.all([loadBlocks(), loadUsage()]);
		return { blocks, usage };
	});
	const [now, setNow] = createSignal(new Date());
	const timer = setInterval(() => { setNow(new Date()); refetch(); }, 10000);
	onCleanup(() => clearInterval(timer));

	const [editing, setEditing] = createSignal<Block | null>(null);
	const [error, setError] = createSignal<string | null>(null);

	const persist = async (blocks: Block[]) => {
		await saveBlocks(blocks);
		await refetch();
		await sendToServiceWorker({ type: 'notifyOptionsUpdated' });
	};

	// Re-reads storage before any change, so a strict block that became active meanwhile is respected
	const guardedUpdate = async (id: string, change: (blocks: Block[]) => Block[]) => {
		const [blocks, usage] = await Promise.all([loadBlocks(), loadUsage()]);
		const current = blocks.find(b => b.id === id);
		if (current != null && isLocked(current, usage, new Date())) {
			setError('This block is in strict mode and active right now, so it can\'t be changed until it ends.');
			await refetch();
			return false;
		}
		await persist(change(blocks));
		return true;
	};

	const save = async (draft: Block) => {
		const clean = sanitizeBlock(draft);
		if (clean == null) return;
		if (clean.siteIds.length === 0) { setError('Choose at least one site.'); return; }
		if (clean.schedule.length === 0 && clean.dailyLimitMin == null && clean.hourlyLimitMin == null) {
			setError('Add a schedule or a usage limit, otherwise the block never applies.'); return;
		}
		const ok = await guardedUpdate(clean.id, blocks => {
			const exists = blocks.some(b => b.id === clean.id);
			return exists ? blocks.map(b => b.id === clean.id ? clean : b) : [...blocks, clean];
		});
		if (ok) { setEditing(null); setError(null); }
	};

	const remove = async (id: string) => {
		if (await guardedUpdate(id, blocks => blocks.filter(b => b.id !== id))) { setEditing(null); setError(null); }
	};

	const toggle = (b: Block) => guardedUpdate(b.id, blocks => blocks.map(x => x.id === b.id ? { ...x, enabled: !x.enabled } : x));

	const siteTitle = (id: string) => state.siteList.get()?.sites.find(s => s.id === id)?.title ?? id;

	return <div class="p-8 space-y-4">
		<div class="space-y-1">
			<p>A block groups sites and decides when they are blocked: during a schedule, or once you've used them for a number of minutes per day or per hour. Time is counted only while one of the block's sites is the active, visible tab.</p>
			<p class="text-secondary font-xs">Blocks apply to sites switched on in the Sites tab.</p>
		</div>

		<Show when={error()}>
			<div class="card primary p-2 flex cross-center gap-2"><span class="flex-1">{error()}</span><button onClick={() => setError(null)}>Dismiss</button></div>
		</Show>

		<Show when={editing()} fallback={
			<Show when={data()}>{d => <div class="space-y-2">
				<For each={d().blocks} fallback={<p class="text-secondary">No blocks yet.</p>}>{b => {
					const statuses = () => evaluateBlock(b, d().usage, now());
					const active = () => statuses().length > 0;
					const locked = () => isLocked(b, d().usage, now());
					const left = () => remaining(b, d().usage, now());
					return <div class="card p-4 space-y-2" style={{ "border-radius": '8px', "border-left": 'none', outline: active() ? '2px solid var(--theme-accent)' : 'none' }}>
						<div class="flex cross-center gap-2">
							<input type="checkbox" class="toggle" aria-label={`Turn ${b.name} on or off`} checked={b.enabled} disabled={locked()} onChange={() => toggle(b)} />
							<strong class="flex-1">{b.name}</strong>
							<Show when={b.strict}><span class="font-xs text-secondary">Strict</span></Show>
							<button class="secondary" disabled={locked()} onClick={() => { setError(null); setEditing(structuredClone(unwrap(b))); }}>{locked() ? 'Locked' : 'Edit'}</button>
						</div>
						<div class="flex gap-2" style={{ "flex-wrap": 'wrap' }}>
							<For each={b.siteIds}>{id => <span class="flex cross-center gap-2 font-xs"><SiteLogo siteId={id} size={18} />{siteTitle(id)}</span>}</For>
						</div>
						<div class="font-xs text-secondary space-y-1">
							<Show when={active()}>
								{(() => { const s = statuses().reduce((a, c) => c.until > a.until ? c : a); return <div style={{ color: 'var(--theme-accent)', "font-weight": 'bold' }}>Active until {time(s.until)} ({REASON[s.reason]})</div>; })()}
							</Show>
							<For each={b.schedule}>{r => <div>{daysSummary(r.days)}, {r.start} to {r.end}</div>}</For>
							<Show when={b.dailyLimitMin != null}><div>{b.dailyLimitMin} min per day, {left().dailyMin} min left today</div></Show>
							<Show when={b.hourlyLimitMin != null}><div>{b.hourlyLimitMin} min per hour, {left().hourlyMin} min left this hour</div></Show>
						</div>
					</div>;
				}}</For>
				<button class="primary" onClick={() => { setError(null); setEditing(newBlock(generateId())); }}>New block</button>
			</div>}</Show>
		}>
			{draft => <BlockEditor initial={draft()} isNew={!data()?.blocks.some(b => b.id === draft().id)} onSave={save} onCancel={() => { setEditing(null); setError(null); }} onDelete={remove} />}
		</Show>
	</div>;
};

const BlockEditor = (props: { initial: Block, isNew: boolean, onSave: (b: Block) => void, onCancel: () => void, onDelete: (id: string) => void }) => {
	const state = useOptionsPageState();
	const [b, setB] = createStore<Block>(structuredClone(props.initial));
	const [useDaily, setUseDaily] = createSignal(props.initial.dailyLimitMin != null);
	const [useHourly, setUseHourly] = createSignal(props.initial.hourlyLimitMin != null);

	const enabledSites = (): string[] => state.enabledSites.get() ?? [];
	const toggleSite = (id: string) => setB('siteIds', ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
	const toggleDay = (i: number, day: number) => setB('schedule', i, 'days', days => days.includes(day) ? days.filter(d => d !== day) : [...days, day]);

	const submit = () => {
		const out: Block = structuredClone(unwrap(b));
		out.dailyLimitMin = useDaily() ? (out.dailyLimitMin ?? 30) : null;
		out.hourlyLimitMin = useHourly() ? (out.hourlyLimitMin ?? 10) : null;
		props.onSave(out);
	};

	const badRange = (r: { start: string, end: string, days: number[] }) => parseHM(r.start) == null || parseHM(r.end) == null || r.days.length === 0;

	return <form class="space-y-4" onSubmit={e => { e.preventDefault(); submit(); }}>
		<label class="block space-y-1">
			<span class="block font-bold">Name</span>
			<input type="text" class="w-full" maxLength={60} value={b.name} onInput={e => setB('name', e.currentTarget.value)} style={{ padding: '8px' }} />
		</label>

		<fieldset class="space-y-2" style={{ border: 'none', padding: 0, margin: 0 }}>
			<legend class="font-bold">Sites</legend>
			<div style={{ display: 'grid', "grid-template-columns": 'repeat(2, minmax(0, 1fr))', gap: '4px' }}>
				<For each={state.siteList.get()?.sites}>{site => <label class="flex cross-center gap-2 hoverable p-1 cursor-pointer">
					<input type="checkbox" checked={b.siteIds.includes(site.id)} onChange={() => toggleSite(site.id)} />
					<SiteLogo siteId={site.id} size={20} />
					<span class="flex-1">{site.title}</span>
					<Show when={!enabledSites().includes(site.id)}><span class="font-xs text-secondary">off</span></Show>
				</label>}</For>
			</div>
			<Show when={b.siteIds.some(id => !enabledSites().includes(id))}>
				<p class="font-xs text-secondary">Sites marked "off" must be switched on in the Sites tab for this block to apply to them.</p>
			</Show>
		</fieldset>

		<fieldset class="space-y-2" style={{ border: 'none', padding: 0, margin: 0 }}>
			<legend class="font-bold">Block during these times</legend>
			<For each={b.schedule}>{(r, i) => <div class="flex cross-center gap-2" style={{ "flex-wrap": 'wrap' }}>
				<div class="flex" style={{ gap: '4px' }} role="group" aria-label="Days">
					<For each={DAYS}>{d => <button type="button" aria-label={d.long} aria-pressed={r.days.includes(d.value)}
						onClick={() => toggleDay(i(), d.value)}
						style={{ width: '36px', height: '36px', padding: 0, "border-radius": '50%', border: '1px solid var(--theme-accent)',
							background: r.days.includes(d.value) ? 'var(--theme-accent)' : 'transparent',
							color: r.days.includes(d.value) ? 'var(--theme-accent-figure)' : 'var(--theme-figure)' }}>{d.label}</button>}</For>
				</div>
				<input type="time" aria-label="Start" value={r.start} onInput={e => setB('schedule', i(), 'start', e.currentTarget.value)} />
				<span>to</span>
				<input type="time" aria-label="End" value={r.end} onInput={e => setB('schedule', i(), 'end', e.currentTarget.value)} />
				<button type="button" onClick={() => setB('schedule', s => s.filter((_, j) => j !== i()))}>Remove</button>
				<Show when={badRange(r)}><span class="font-xs" style={{ color: 'var(--theme-accent)' }}>Pick at least one day and both times.</span></Show>
			</div>}</For>
			<button type="button" class="secondary" onClick={() => setB('schedule', s => [...s, { days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' }])}>Add time range</button>
			<p class="font-xs text-secondary">An end time earlier than the start (22:00 to 07:00) runs overnight. Same start and end blocks the whole day.</p>
		</fieldset>

		<fieldset class="space-y-2" style={{ border: 'none', padding: 0, margin: 0 }}>
			<legend class="font-bold">Usage limits</legend>
			<label class="flex cross-center gap-2">
				<input type="checkbox" class="toggle" checked={useDaily()} onChange={e => setUseDaily(e.currentTarget.checked)} />
				<span>Daily limit</span>
				<Show when={useDaily()}><input type="number" min="0" max="1440" aria-label="Minutes per day" value={b.dailyLimitMin ?? 30} onInput={e => setB('dailyLimitMin', e.currentTarget.valueAsNumber)} style={{ width: '72px' }} /><span>minutes per day</span></Show>
			</label>
			<label class="flex cross-center gap-2">
				<input type="checkbox" class="toggle" checked={useHourly()} onChange={e => setUseHourly(e.currentTarget.checked)} />
				<span>Hourly limit</span>
				<Show when={useHourly()}><input type="number" min="0" max="60" aria-label="Minutes per hour" value={b.hourlyLimitMin ?? 10} onInput={e => setB('hourlyLimitMin', e.currentTarget.valueAsNumber)} style={{ width: '72px' }} /><span>minutes per hour</span></Show>
			</label>
			<p class="font-xs text-secondary">Limits count the time spent on all of this block's sites together.</p>
		</fieldset>

		<label class="flex cross-center gap-2">
			<input type="checkbox" class="toggle" checked={b.strict} onChange={e => setB('strict', e.currentTarget.checked)} />
			<span class="space-y-1">
				<span class="block">Strict mode</span>
				<span class="block font-xs text-secondary">While the block is active it can't be paused, edited or deleted, and its sites can't be switched off. It can still be bypassed by disabling the extension in Chrome.</span>
			</span>
		</label>

		<div class="flex gap-2">
			<button type="submit" class="primary">Save</button>
			<button type="button" class="secondary" onClick={props.onCancel}>Cancel</button>
			<span class="flex-1" />
			<Show when={!props.isNew}><button type="button" class="secondary" onClick={() => props.onDelete(b.id)}>Delete block</button></Show>
		</div>
	</form>;
};
