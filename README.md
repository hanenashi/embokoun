# embokoun

Embokoun is the modular successor to `vidokoun`.

Goal: make Okoun video embedding maintainable, testable, and expandable without growing one cursed mega-userscript forever.

## Install

Install the loader userscript:
https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.user.js


## Current status

`0.1.0-alpha`

This first version is a modular skeleton with:

- thin `embokoun.user.js` loader
- classic `@require`-loaded modules for userscript-manager compatibility
- Tampermonkey / Kiwi support through `GM_xmlhttpRequest`
- Greasemonkey 4+ support through `GM.xmlHttpRequest`
- userscript menu settings via `GM_registerMenuCommand` / `GM.registerMenuCommand`
- localStorage-backed settings
- toggleable logging levels
- modular service registry
- Direct MP4 service
- YouTube service
- universal iframe helper
- Okoun DOM scanner and MutationObserver

This is intentionally not yet full Vidokoun parity. First we build the bones, then bolt the monster muscles on.

## File layout

```text
embokoun.user.js
src/core/namespace.js
src/core/gm.js
src/core/log.js
src/core/config.js
src/core/ui.js
src/core/dom.js
src/services/direct-mp4.js
src/services/youtube.js
src/services/index.js
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

A service has this shape:

```javascript
{
  key: 'youtube',
  label: 'YouTube',
  match(url) {},
  embed(ctx) {}
}
```

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
```

## Settings

Open from the userscript manager menu:

```text
Embokoun settings
```

Current settings:

- log level
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

Next service modules to port from Vidokoun:

- Vimeo
- Twitter/X leech core
- Instagram leech core
- Facebook leech core
- Telegram leech core
- shared blob downloader / memory cleanup queue
- fallback iframe strategy per service
- heavier diagnostics panel

## Design rule

Each service gets its own leech core.

If one service breaks, it should not turn the whole userscript into soup.
