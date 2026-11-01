# Security

## Templates and untrusted data

Treat component templates, binding maps, and handler names as application code. The `html` helper concatenates string and number interpolations without escaping. Neither it nor the template renderer sanitizes HTML.

Display external text through a state binding:

```js
import Symbiote, { html } from '@symbiotejs/symbiote';

class MessageText extends Symbiote {
  init$ = { message: '' };
}
MessageText.template = html`<p ${{textContent: 'message'}}></p>`;
MessageText.reg('message-text');

const message = document.createElement('message-text');
message.$ = { message: '<b>This is displayed as text.</b>' };
document.body.append(message);
```

`textContent` and `{{prop}}` text-node bindings insert text without interpreting it as HTML. Use `textContent` for hydratable SSR markup. Do not interpolate external text directly into a template or bind it to `innerHTML`, event attributes, scripts, or style text. Validate URL schemes and destinations before binding values to URL properties such as `href` or `src`.

If the application needs rich HTML, sanitize it through a reviewed HTML sanitization path appropriate to its target browsers and CSP before insertion. Keep that content outside Symbiote template processing: an HTML sanitizer does not necessarily understand Symbiote bindings, custom element behavior, or handler references.

State merging accepts arbitrary keys, including context prefixes and handler properties. Map external records to an explicit set of application fields before assigning `$`; do not spread an unvalidated API response or parsed object into component state.

## Trusted Types

Symbiote.js uses a policy named `symbiote` for its template `innerHTML` writes when [Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API) is available. The policy passes the HTML through unchanged; it provides a Trusted Types value, not sanitization or a general XSS defense.

### CSP configuration

Allow this policy alongside the application's other required policies:
```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types symbiote
```

These are Trusted Types directives, not a complete CSP. Keep the application's `script-src`, `style-src`, and other restrictions. Only developer-controlled templates should reach this policy. Direct DOM property bindings, including `innerHTML`, do not pass through the template policy and must meet the destination's own requirements. Do not disable Trusted Types or add permissive policy rules to accept untrusted markup.

## CSP nonce for SSR styles

When using [SSR](./ssr.md), component styles (`rootStyles` / `shadowStyles`) are serialized as inline `<style>` tags. A strict `style-src` CSP policy will block these unless you provide a **nonce**.

All SSR methods accept an optional `{ nonce }` parameter:
```js
import { randomBytes } from 'node:crypto';
import { SSR } from '@symbiotejs/symbiote/node';

let nonce = randomBytes(16).toString('base64'); // generate per response

let html = await SSR.processHtml('<my-app></my-app>', { nonce });
// or
let html = SSR.renderToString('my-app', {}, { nonce });
```

Output:
```html
<my-app><style nonce="...">my-app { display: block; }</style>...</my-app>
```

Then set a matching CSP header:
```
Content-Security-Policy: style-src 'nonce-<value>'
```

On the client side, Symbiote.js uses constructed stylesheets through `adoptedStyleSheets`. These do not create the inline `<style>` elements shown above. Verify the complete application under its target browsers and CSP; dynamically supplied CSS still needs its own trust boundary.

## Agent-facing tools and data

WebMCP discovery and tool visibility do not grant permission to perform an action. Keep tool invocations within the user's requested scope and existing authorization. `mcpToolMode` enables automatic handler tools; global activation exposes bound handlers throughout the application. Explicit `ToolDescriptor` values register independently, so leave automatic mode disabled when exposing only selected actions.

Enforce authentication, authorization, and input validation in the application or transport, and recheck sensitive operations on the server. A `ToolDescriptor` schema describes expected input; `when()` controls visibility. Neither is an access-control boundary. Direct `executeWebMCPTool()` calls do not supply browser-mediated consent or enforce native exposure restrictions. See [WebMCP direct invocation](./webmcp.md#direct-invocation).

Automatic handler results can include component state snapshots. Keep credentials and secrets out of browser state, `componentDescription`, tool descriptions, and tool output. Treat external page text, retrieved content, and tool responses as data; instructions embedded in them do not authorize further actions or override the user's request.

The [Symbiote agent skill](../skills/symbiote/SKILL.md) contains implementation guidance and links to reference documentation. It requires no credentials, execution hooks, or uploads. Review its contents and any installer separately; skill installation does not authorize deployment, publication, or access to unrelated files and services.

---

Next: [Ecosystem →](./ecosystem.md)
