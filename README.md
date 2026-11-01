# Scroll Less

A browser extension that hides music, Shorts and other feed distractions on YouTube (and replaces feeds on a few other sites with a quote).

*By [Mlamali The Engineer](https://github.com/Mlamalerie).*

> The name is set in one place: `title` in `package.json`.

**This is a fork of [News Feed Eradicator](https://github.com/jordwest/news-feed-eradicator), created by [Jordan West](https://west.io/) and its [contributors](https://github.com/jordwest/news-feed-eradicator/graphs/contributors).** The engine, the options page, the quote widget and most supported sites are theirs. It keeps the original AGPL-3.0 licence (see `LICENSE` and [`NOTICE.md`](NOTICE.md) for full credits and third-party notices).

## Why this exists

I wanted to stop losing time on social media (X, Instagram and above all TikTok), and on YouTube I wanted to choose videos on purpose instead of being carried along by the algorithm. I also used to think background music made me more productive. It did not: it was one more thing pulling my attention away from what matters to me. So this fork hides the feeds, the recommendations and the music, and leaves what I came for: searching, picking something intentionally, and watching it.

*Pourquoi ce projet : perdre moins de temps sur X, Instagram et surtout TikTok, et sur YouTube choisir mes vidéos volontairement plutôt que de me laisser happer par l'algorithme, sans musique qui ne sert à rien dans ma vie. Je pensais que la musique me rendait plus productif, ce n'était pas le cas.*

## What it does on YouTube

- Hides **Shorts** (shelves, thumbnails, the sidebar button).
- Hides **music** (on by default; the "Music" region can be switched off in the options page). What counts as music is configurable under **Sites > YouTube**:
  - videos from **official artist channels** (the rosette badge),
  - auto-generated **"Artist - Topic"** channels,
  - **Mixes** and auto-generated album playlists,
  - **titles** such as "Official Music Video", "Lyric Video", "(Audio)", "Clip officiel", "Full album",
  - home-page **shelves** titled Music / Mix / Musique,
  - the **YouTube Music** link in the sidebar.
- Choose **where** it applies: home, search, suggestions next to a video, and "everywhere else" (subscriptions, channel pages, playlists, history; off by default).
- **Never hide** a list of channels (one per line), and **also hide** titles containing your own words.

## Other sites

TikTok (feeds), Instagram (feed, stories, suggestions, Explore, Reels), X (feed, "For you" posts, trends and news), plus the sites supported by the original project. Switch each site on in the options page; the browser asks for permission per site.

Blocks (time limits): group sites into a block and choose when they are blocked, inspired by phone app blockers:
- **Schedule**: days of the week and time ranges (overnight ranges work, e.g. 22:00 to 07:00).
- **Daily limit**: minutes per day across the block's sites, then blocked until midnight.
- **Hourly limit**: minutes per clock hour, then blocked until the next hour.
- **Strict mode**: while active, the block can't be paused, edited or deleted, and its sites can't be switched off. A browser extension can't stop you from disabling it in `chrome://extensions`, so strict mode raises the effort rather than making it impossible.

Time is counted only while one of the block's sites is the visible, focused tab, and only in this browser (not on your phone).

Quotes: the widget shows a quote in place of the feed. English quotes come from the original project; 22 French quotes (Pascal, Montaigne, Saint-Exupéry, Sénèque, Simone Weil...) were added, and you can choose the language under Style.

Statistics: the toolbar icon shows how much was hidden today, and the Statistics tab shows the last 7 days and 30-day totals. Everything stays on your device.

Also available on YouTube: hide the main feed, suggested videos, comments, live chat, notifications and subscriptions.

## Known limitations

YouTube changes its page markup often. The music filter reads the page text and a few markup details (the artist badge, `list=RD` links), so a YouTube redesign can break a detector until it is updated. Title patterns are heuristics and can miss or over-match; use the allow list and your own keywords to tune them.

---

## Publishing

Store listing texts, permission justifications and images are in [`store/`](store/LISTING.md); the privacy policy is [`PRIVACY.md`](PRIVACY.md).

## Development

This extension is built as a WebExtension (Manifest V3), supported by Chrome and Firefox.

### Dependencies

 - [bun](https://bun.com/)
 - make

To build, clone the repository and run:

    make dev

Then load the `build` folder as an _unpacked_ (Chrome) or _temporary_ (Firefox) extension. `make dev` watches for changes and rebuilds; reload the extension in the browser after each rebuild.

Run the tests with:

    bun test

To build a distributable `.zip` for production:

    make

The package is written to `dist/`.

### Where the music filter lives

- `src/lib/music-filter.ts`: settings, defaults and the classification rules (no DOM, unit tested).
- `src/entrypoints/intercept/music-scanner.ts`: scans YouTube cards and hides the ones classified as music.
- `src/sitelist/youtube.ts`: the `artist-channels` region is the on/off switch.
- `src/entrypoints/options-page/tabs/sites/youtube-music-settings.tsx`: the settings UI.
