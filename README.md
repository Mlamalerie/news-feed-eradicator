# Silent Feed

A browser extension that hides music, Shorts and other feed distractions on YouTube (and replaces feeds on a few other sites with a quote).

> The working name "Silent Feed" is a placeholder: it is set in one place (`title` in `package.json`).

This is a fork of [News Feed Eradicator](https://github.com/jordwest/news-feed-eradicator) by Jordan West and contributors. It keeps the original AGPL-3.0 licence (see `LICENSE`); the engine and the other supported sites come from that project.

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

Also available on YouTube: hide the main feed, suggested videos, comments, live chat, notifications and subscriptions.

## Known limitations

YouTube changes its page markup often. The music filter reads the page text and a few markup details (the artist badge, `list=RD` links), so a YouTube redesign can break a detector until it is updated. Title patterns are heuristics and can miss or over-match; use the allow list and your own keywords to tune them.

---

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
