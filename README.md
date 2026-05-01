# embokoun

Embokoun is the modular successor to `vidokoun`.

Goal: make Okoun media embedding maintainable, testable, and expandable without growing one cursed mega-userscript forever.

## Install

Install the loader userscript:
[https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.user.js](https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.user.js)

## Current status

`0.4.4-alpha`

This version is a modular userscript with a universal `resolve -> render` layer and first useful Telegram support.

Current features:

- thin `embokoun.user.js` loader
- classic `@require`-loaded modules for userscript-manager compatibility
- Tampermonkey / Kiwi support through `GM_xmlhttpRequest`
- Greasemonkey 4+ support through `GM.xmlHttpRequest`
- userscript menu settings via `GM_registerMenuCommand` / `GM.registerMenuCommand`
- localStorage-backed settings
- toggleable logging levels
- configurable blob size limit and active blob cleanup limit
- cancelable blob download panel with progress text
- small settings button injected into media placeholders
- compact / medium / large Telegram placeholder setting
- modular service registry
- universal `resolve -> render` core with backward-compatible old `embed()` support
- universal iframe helper
- Okoun DOM scanner and MutationObserver

Current services:

- Direct MP4
- YouTube, with thumbnail placeholders
- Vimeo
- Twitter/X, using metadata lookup, blob-loaded MP4 path, progress/cancel, and iframe fallback
- Telegram, with native cards for text/photo/mixed posts, blob-loaded playable video tiles, and iframe fallback

This is still not full Vidokoun parity. But Telegram is no longer just a video goblin with a regex club.

## Telegram behavior

Telegram links such as:

```text
https://t.me/channel/12345
https://t.me/s/channel/12345
```

are resolved through the public embed page:

```text
https://t.me/channel/12345?embed=1&mode=tme
```

Embokoun then tries this order:

```text
1. fetch Telegram embed HTML
2. parse media and text
3. pure single video post -> blob video
4. mixed video/photo/text post -> native Telegram card
5. photo/text post -> native Telegram card
6. weird/unsupported post -> iframe fallback
```

Mixed Telegram posts keep the full card readable:

```text
Telegram card
├─ video tile -> click to blob-load local video
├─ photo tile(s)
├─ full text with links cleaned for Okoun
└─ footer actions: Video / Open
```

The video tile does **not** open the Telegram CDN directly. It uses the same blob download path as Twitter/X, so it avoids browser page CSP/media-src trouble where possible.

## Media strategy notes

Deeper design notes live here:

[docs/media-strategy-notes.md](docs/media-strategy-notes.md)

That document tracks the wider architecture plan:

- animated GIF handling: optional click-to-load replacement/overlay
- controlled blob loading with limits, cleanup, cancel, and progress UI
- Telegram post reality: video/image/text/mixed posts need sane fallback behavior
- universal `resolve -> render` service result model
- universal fallback iframe/card helper
- wider/taller iframe display modes
- logging requirements for service leech cores

Main idea: services resolve media intent first, then core rendering decides whether to blob-load video, show image/card, or use iframe fallback. Less soup. More skeleton.

## File layout

```text
embokoun.user.js
src/core/namespace.js
src/core/gm.js
src/core/log.js
src/core/config.js
src/core/ui.js
src/core/blob.js
src/core/render.js
src/core/dom.js
src/services/direct-mp4.js
src/services/youtube.js
src/services/vimeo.js
src/services/twitter.js
src/services/telegram.js
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

Current compatibility service shape still works:

```javascript
{
  key: 'legacy-service',
  label: 'Legacy Service',
  match(url) {},
  embed(ctx) {},
  fallback(ctx) {}
}
```

New preferred service shape:

```javascript
{
  key: 'direct-mp4',
  label: 'Direct MP4',
  match(url) {},
  async resolve(ctx) {
    return {
      kind: 'video-url',
      url: 'https://example.com/video.mp4',
      blob: false,
      aspect: '16/9',
      reason: 'direct-mp4'
    };
  },
  fallback(ctx) {}
}
```

Supported render result kinds:

```text
video-url
image-url
iframe
native-node
none
```

No ES modules, no dynamic `eval`, no clever loader magic. Userscript managers are weird enough already.

## Blob loading

Blob-loaded videos use userscript HTTP requests instead of normal page media loading:

```text
GM_xmlhttpRequest / GM.xmlHttpRequest
↓
Blob
↓
URL.createObjectURL(...)
↓
local <video controls>
```

This is useful for hosts that fail when loaded directly by the page because of CSP, hotlinking, or other tiny bureaucratic goblins.

Blob UI currently provides:

- live progress text
- size limit enforcement
- Cancel button
- active blob cleanup
- page unload cleanup

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
[embokoun:telegram]
[embokoun:blob]
```

## Settings

Open from the userscript manager menu:

```text
Embokoun settings
```

Also available from the small `settings` pill injected into media placeholders.

Current settings:

- log level: off / error / warn / info / debug / trace
- blob size limit: No limit / 25 / 50 / 80 / 120 / 200 MB
- loaded blob videos: 1 / 2 / 3 / 5
- Telegram placeholder size: compact / medium / large
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

Near-term polish:

- better Telegram card styling and compact modes
- optional auto-load rules per service
- GIF click-to-load strategy
- better diagnostics panel
- wider/taller iframe/card helper exposed through settings

Next service modules to port from Vidokoun:

- Instagram leech core
- Facebook leech core
- other cursed hosts as encountered in the wild

## Design rule

Each service gets its own leech core.

If one service breaks, it should not turn the whole userscript into soup.
