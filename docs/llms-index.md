# Symbiote.js

> Lightweight, standards-first UI library built on Web Components. Zero dependencies, ~7.3 kb brotli. No virtual DOM, no compiler, no build step required. Works in any framework or plain HTML.

Symbiote.js extends HTMLElement natively. State changes update the DOM synchronously. Components are real custom elements. Supports SSR with isomorphic hydration, WebMCP for exposing UI as browser-native agent tools, and optional Shadow DOM.

## Key resources

- [Full documentation (single file)](https://rnd-pro.com/symbiote/llms-full.txt): Complete merged reference — paste this into any AI tool for full context
- [README](https://github.com/symbiotejs/symbiote.js/blob/main/README.md): Overview, quick start, and feature summary

## Core concepts

- [Get Started](https://github.com/symbiotejs/symbiote.js/blob/main/docs/get-started.md): Installation, CDN usage, first component
- [Templates](https://github.com/symbiotejs/symbiote.js/blob/main/docs/templates.md): html` ` tagged template, binding syntax, slots, refs
- [Properties & State](https://github.com/symbiotejs/symbiote.js/blob/main/docs/properties.md): init$, $ proxy, subscriptions, computed properties
- [Context](https://github.com/symbiotejs/symbiote.js/blob/main/docs/context.md): Local, named (`X/`), pop-up (`^`), shared (`*`) contexts
- [List Rendering](https://github.com/symbiotejs/symbiote.js/blob/main/docs/list-rendering.md): itemize API, inline templates, item-tag
- [Lifecycle](https://github.com/symbiotejs/symbiote.js/blob/main/docs/lifecycle.md): initCallback, renderCallback, destroyCallback
- [Flags](https://github.com/symbiotejs/symbiote.js/blob/main/docs/flags.md): pauseRender, renderShadow, ssrMode, isoMode, lazyMode
- [Attributes](https://github.com/symbiotejs/symbiote.js/blob/main/docs/attributes.md): bindAttributes, attribute observation

## State management

- [PubSub](https://github.com/symbiotejs/symbiote.js/blob/main/docs/pubsub.md): Standalone named contexts, registerCtx, multiPub

## Styling

- [Styling](https://github.com/symbiotejs/symbiote.js/blob/main/docs/styling.md): rootStyles, shadowStyles, css` ` tag, adoptedStyleSheets
- [CSS Data](https://github.com/symbiotejs/symbiote.js/blob/main/docs/css-data.md): CSS custom properties as reactive component state

## Features

- [WebMCP (Experimental)](https://github.com/symbiotejs/symbiote.js/blob/main/docs/webmcp.md): Expose live UI handlers as browser-native agent tools
- [Routing](https://github.com/symbiotejs/symbiote.js/blob/main/docs/routing.md): AppRouter, path patterns, guards, lazy loading
- [SSR](https://github.com/symbiotejs/symbiote.js/blob/main/docs/ssr.md): Server-side rendering, streaming, hydration
- [SSR Server Setup](https://github.com/symbiotejs/symbiote.js/blob/main/docs/ssr-server.md): Static build, Express, Fastify
- [Animations](https://github.com/symbiotejs/symbiote.js/blob/main/docs/animations.md): animateOut, CSS-driven exit transitions

## Development

- [Dev Mode](https://github.com/symbiotejs/symbiote.js/blob/main/docs/dev-mode.md): Verbose warnings, devMessages.js
- [TypeScript](https://github.com/symbiotejs/symbiote.js/blob/main/docs/typescript.md): JSDoc types, d.ts, hybrid template checks
- [Security](https://github.com/symbiotejs/symbiote.js/blob/main/docs/security.md): Trusted Types, CSP

## Guidance

- [Common Mistakes](https://github.com/symbiotejs/symbiote.js/blob/main/docs/common-mistakes.md): Patterns that frequently cause bugs
- [Examples](https://github.com/symbiotejs/symbiote.js/blob/main/docs/examples.md): 26 complete working examples across all features
