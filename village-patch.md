# Village Patch — Pass Proto Data to Carl

In `app.js`, find the `openCarlModal()` function (around line 898).

## Current code (line 927):
```js
iframe.src = 'https://carl.typelabs.ai?from=village&returnUrl=' + encodeURIComponent(window.location.href);
```

## Replace with:
```js
var carlParams = ['from=village', 'returnUrl=' + encodeURIComponent(window.location.href)];
var carlProto = buildProtoContext();
if (carlProto) {
  carlParams.push('proto=' + encodeURIComponent(JSON.stringify(carlProto)));
}
iframe.src = 'https://carl.typelabs.ai?' + carlParams.join('&');
```

This mirrors the exact same pattern used by `openWimmyModal()` (lines 976-981).
