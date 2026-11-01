import type { BlockStatus } from '../../lib/blocks';

/**
 * Full-page screen shown when a block (schedule, daily or hourly limit) applies to the site.
 * Built with plain DOM inside a closed shadow root so the site's CSS can't reach it.
 */

const REASON_TEXT: Record<BlockStatus['reason'], string> = {
	schedule: 'Blocked by your schedule',
	daily: 'Daily limit reached',
	hourly: 'Hourly limit reached',
};

const formatUntil = (until: number) => {
	const d = new Date(until);
	const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	const sameDay = d.toDateString() === new Date().toDateString();
	return sameDay ? `until ${time}` : `until ${d.toLocaleDateString(undefined, { weekday: 'long' })} ${time}`;
};

const CSS = `
:host { all: initial; }
.wrap { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center;
	background: #14130f; color: #f3ead9; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
.card { max-width: 440px; padding: 32px; text-align: center; }
.ring { width: 72px; height: 72px; margin: 0 auto 24px; }
h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; }
.reason { margin: 0; color: #cc7744; font-weight: 600; }
.until { margin: 4px 0 24px; color: #b9b1a2; }
.hint { margin: 0; color: #8f887b; font-size: 14px; }
`;

const RING = `<svg class="ring" viewBox="0 0 128 128" aria-hidden="true"><circle cx="64" cy="64" r="46" fill="none" stroke="#5c574d" stroke-width="6"/><circle cx="64" cy="64" r="30" fill="none" stroke="#f3ead9" stroke-width="6"/><circle cx="64" cy="64" r="12" fill="#cc7744"/></svg>`;

export class BlockOverlay {
	private host?: HTMLElement;
	private els?: { name: HTMLElement, reason: HTMLElement, until: HTMLElement, hint: HTMLElement };
	private mediaTimer?: ReturnType<typeof setInterval>;
	private previousOverflow = '';

	get visible() {
		return this.host?.isConnected === true;
	}

	show(status: BlockStatus) {
		if (!this.visible) this.mount();
		this.els!.name.textContent = status.name;
		this.els!.reason.textContent = REASON_TEXT[status.reason];
		this.els!.until.textContent = formatUntil(status.until);
		this.els!.hint.textContent = status.strict
			? 'Strict mode: this block cannot be paused.'
			: 'You can pause blocks from the extension\'s options (Snooze).';
		this.pauseMedia();
	}

	hide() {
		if (!this.visible) return;
		this.host!.remove();
		document.documentElement.style.overflow = this.previousOverflow;
		if (this.mediaTimer != null) clearInterval(this.mediaTimer);
		this.mediaTimer = undefined;
	}

	private mount() {
		this.host = document.createElement('nfe-block-overlay');
		const shadow = this.host.attachShadow({ mode: 'closed' });
		shadow.innerHTML = `<style>${CSS}</style><div class="wrap" role="alertdialog" aria-modal="true" aria-labelledby="t"><div class="card">${RING}<h1 id="t"></h1><p class="reason"></p><p class="until"></p><p class="hint"></p></div></div>`;
		const q = (s: string) => shadow.querySelector(s) as HTMLElement;
		this.els = { name: q('h1'), reason: q('.reason'), until: q('.until'), hint: q('.hint') };
		document.documentElement.appendChild(this.host);
		this.previousOverflow = document.documentElement.style.overflow;
		document.documentElement.style.overflow = 'hidden';
		// Sites keep playing in the background and autoplay new media, so keep pausing while shown
		this.mediaTimer = setInterval(() => this.pauseMedia(), 1000);
	}

	private pauseMedia() {
		for (const m of document.querySelectorAll('video, audio')) {
			const media = m as HTMLMediaElement;
			if (!media.paused) media.pause();
		}
	}
}
