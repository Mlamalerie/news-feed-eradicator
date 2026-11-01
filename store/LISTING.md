# Chrome Web Store submission — Stop Scrolling, Start Winning

Everything to paste into the developer dashboard (https://chrome.google.com/webstore/devconsole).
Upload: `dist/StopScrollingStartWinning_<version>.zip` (built with `make`).

## Store listing tab

**Name** (from the manifest): Stop Scrolling, Start Winning

**Summary** (from the manifest, 132 chars max):
Hide feeds, Shorts and music, and set schedules and time limits for distracting sites. Choose what you watch.

**Category**: Productivity (Workflow & Planning, or Tools)

**Language**: English (add French below as a second language if you want)

**Description (English)**:

Stop Scrolling, Start Winning helps you use the web on purpose instead of by reflex.

Replace endless feeds with a quote, so you open a site, do what you came for, and leave.

On YouTube:
• hide the home feed, recommendations and Shorts
• hide music: official artist channels, auto-generated "Topic" channels, Mixes and music videos, with a list of channels to keep
• search and watch what you chose, without the algorithm pulling you elsewhere

Blocks (time limits):
• block a group of sites on a weekly schedule (for example weekdays 9:00–18:00)
• daily and hourly usage limits (for example 30 minutes a day)
• strict mode: a block can't be paused or edited while it is active

Statistics: see how much was hidden and how much time you spent on each site today.

Works on YouTube, TikTok, Instagram, X and Reddit, and more sites listed in the options page.

Private by design: everything stays on your device. No account, no tracking, no data sent anywhere.

Based on the open-source News Feed Eradicator by Jordan West. Source code: https://github.com/Mlamalerie/news-feed-eradicator

**Description (Français)**:

Stop Scrolling, Start Winning vous aide à utiliser le web volontairement, pas par réflexe.

Les fils infinis sont remplacés par une citation : vous ouvrez un site, faites ce pour quoi vous êtes venu, et repartez.

Sur YouTube :
• masque le fil d'accueil, les recommandations et les Shorts
• masque la musique : chaînes d'artistes officiels, chaînes « Topic », Mix et clips, avec une liste de chaînes à garder
• cherchez et regardez ce que vous avez choisi, sans que l'algorithme vous entraîne ailleurs

Blocs (limites de temps) :
• bloquez un groupe de sites selon un horaire (par exemple en semaine de 9 h à 18 h)
• limites d'utilisation par jour et par heure (par exemple 30 minutes par jour)
• mode strict : un bloc actif ne peut être ni mis en pause ni modifié

Statistiques : ce qui a été masqué et le temps passé sur chaque site aujourd'hui.

Fonctionne sur YouTube, TikTok, Instagram, X et Reddit, et d'autres sites listés dans les options.

Respect de la vie privée : tout reste sur votre appareil. Pas de compte, pas de suivi, aucune donnée envoyée.

Basé sur le projet open source News Feed Eradicator de Jordan West. Code source : https://github.com/Mlamalerie/news-feed-eradicator

**Graphic assets** (all in this folder):
- Store icon 128×128: `icon-128.png`
- Screenshots 1280×800: `1-blocked.png`, `2-blocks.png`, `3-youtube-music.png`, `4-statistics.png`
- Small promo tile 440×280: `promo-tile-440x280.png`
- Marquee promo tile 1400×560: `marquee-1400x560.png`
- All images are 24-bit PNG without alpha, as the store requires

**Homepage URL**: https://github.com/Mlamalerie/news-feed-eradicator
**Support URL**: https://github.com/Mlamalerie/news-feed-eradicator/issues

## Privacy tab

**Single purpose**:
Reduce distractions on social media and video sites by hiding feeds, recommendations, Shorts and music, and by blocking those sites on a schedule or after a usage limit chosen by the user.

**Permission justifications**:
- `storage`: saves the user's settings, blocks (schedules and limits), time spent per site and statistics, locally on the device.
- `scripting`: registers the content script only on the sites the user switches on, so the extension can hide feeds and music and show the blocked screen on those sites.
- Host permissions (optional, requested per site at runtime): the extension only works on the supported sites the user switches on (YouTube, TikTok, Instagram, X, Reddit and the others in its list). It requests access to a site when the user enables it, to hide that site's feed and apply blocks.

**Remote code**: No, I am not using remote code.

**Data usage**: tick nothing in the list (the extension does not collect or transmit any user data). Then certify the three statements (not sold to third parties, not used for unrelated purposes, not used for creditworthiness or lending).

**Privacy policy URL**: https://github.com/Mlamalerie/news-feed-eradicator/blob/main/PRIVACY.md

## Distribution tab

Visibility: Public (or Unlisted to try it first with a link). Regions: all.
