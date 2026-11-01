import { useOptionsPageState } from "../../state";

const REPO = "https://github.com/Mlamalerie/news-feed-eradicator";

export const AboutTabContent = () => {
	const state = useOptionsPageState();

	return (
		<div class="p-8 space-y-4">
				<div class="prose">
					<p>Silent Feed hides music, Shorts and other feed distractions so you can use YouTube on purpose instead of by reflex. Everything runs locally in your browser: the extension does not collect or send any data.</p>
				</div>

				<div class="prose">
					<h3>Credits</h3>
					<p>This is a fork of <a href="https://github.com/jordwest/news-feed-eradicator">News Feed Eradicator</a>, created by Jordan West and contributors and released under the AGPL-3.0 licence. The site-blocking engine and most of the supported sites come from that project.</p>
				</div>

				<div class="prose">
					<h3>A site isn't working or I found a bug</h3>
					<p>YouTube changes its page structure often, so filters can break. Please report it <a href={`${REPO}/issues`}>as an issue on GitHub</a> and mention your browser and the page you were on.</p>
				</div>

				<div class="prose">
					<h3>Source code</h3>
					<p><a href={REPO}>{REPO}</a></p>
				</div>

				<div class="text-center">
					<button class="font-xs text-secondary" onClick={() => state.page.set('debug')}>Show debug info</button>
				</div>
			</div>
	);
};
