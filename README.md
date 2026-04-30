# embokoun

Embokoun is the modular successor to `vidokoun`.

Goal: make Okoun video embedding maintainable, testable, and expandable without growing one cursed mega-userscript forever.

## Install

Install the loader userscript:
[https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.user.js](https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.user.js)

## Current status

`0.3.0-alpha`

This first version is a modular skeleton with:

- thin `embokoun.user.js` loader
- classic `@require`-loaded modules for userscript-manager compatibility
- Tampermonkey / Kiwi support through `GM_xmlhttpRequest`
- Greasemonkey 4+ support through `GM.xmlHttpRequest`
- userscript menu settings via `GM_registerMenuCommand` / `GM.registerMenuCommand`
- localStorage-backed settings
- toggleable logging levels
- configurable blob size limit and active blob cleanup limit
- modular service registry
- Direct MP4 service
- YouTube service
- Vimeo service
- Twitter/X service with blob-loading leech core
- universal iframe helper
- Okoun DOM scanner and MutationObserver

This is intentionally not yet full Vidokoun parity. First we build the bones, then bolt the monster muscles on.

## Media strategy notes

Deeper design notes live here:

[docs/media-strategy-notes.md](docs/media-strategy-notes.md)

That document tracks the next architecture step before we keep adding cursed services blindly:

- animated GIF handling: optional click-to-load replacement/overlay
- controlled blob loading with limits, cleanup, and future cancel/progress UI
- Telegram post reality: video/image/text/mixed posts need sane fallback behavior
- universal `resolve -> render` service result model
- universal fallback iframe/card helper
- wider/taller iframe display modes
- logging requirements for service leech cores

Main idea: services should resolve media intent first, then core rendering decides whether to blob-load video, show image/card, or use iframe fallback. Less soup. More skeleton.

## File layout

```text
embokoun.user.js
src/core/namespace.js
src/core/gm.js
src/core/log.js
src/core/config.js
src/core/ui.js
src/core/blob.js
src/core/dom.js
src/services/direct-mp4.js
src/services/youtube.js
src/services/vimeo.js
src/services/twitter.js
src/services/index.js
docs/media-strategy-notes.md
```

## Architecture

Every module attaches to the global namespace:

```javascript
window.Embokoun
```

Every service registers itself through:

```javascript
Embokoun.services.register({ ... })
```

Current service shape:

```javascript
{
  key: 'youtube',
  label: 'YouTube',
  match(url) {},
  embed(ctx) {},
  fallback(ctx) {}
}
```

Planned next-generation service shape is documented in [docs/media-strategy-notes.md](docs/media-strategy-notes.md). The goal is a normalized `resolve -> render` pipeline so Telegram, GIFs, Instagram, Facebook, and future goblins do not all invent their own failure behavior.

No ES modules, no dynamic `eval`, no clever loader magic. Userscript managers are weird enough already.

## Logging

Settings menu exposes logging level:

```text
off / error / warn / info / debug / trace
```

Logs are prefixed like:

```text
[embokoun:dom]
[embokoun:youtube]
[embokoun:direct-mp4]
[embokoun:twitter]
[embokoun:blob]
```

## Settings

Open from the userscript manager menu:

```text
Embokoun settings
```

Current settings:

- log level
- blob size limit: No limit / 25 / 50 / 80 / 120 / 200 MB
- loaded blob videos: 1 / 2 / 3 / 5
- enable/disable each registered service
- reset settings

Settings are stored in:

```javascript
localStorage['embokoun.settings.v1']
```

## Greasemonkey notes

Embokoun includes compatibility wrappers for both API styles:

```javascript
GM_xmlhttpRequest
GM.xmlHttpRequest
GM_registerMenuCommand
GM.registerMenuCommand
```

Remote modules are loaded through `@require`, which is safer and more compatible than fetching JS and evaluating it manually.

## Roadmap

Near-term architecture work:

- universal `resolve -> render` pipeline
- shared fallback iframe/card helper with normal/wide/tall modes
- cancel/progress loading panel for blobs
- GIF click-to-load strategy

Next service modules to port from Vidokoun:

- Telegram leech core using the new fallback model
- Instagram leech core
- Facebook leech core
- heavier diagnostics panel

## Design rule

Each service gets its own leech core.

If one service breaks, it should not turn the whole userscript into soup.
