# Contributing

Thank you for investing your time in contributing to this project! ❤️

## ⚠️ When contributing to this repository, please first discuss the change you wish to make in [issue](https://github.com/symbiotejs/symbiote.js/issues) before making a change. 

* [Issue templates](./.github/ISSUE_TEMPLATE)
* [PR template](./pull_request_template.md)

Please note we have a [code of conduct](./CODE_OF_CONDUCT.md), please follow it in all your interactions with the project.

## HTML-app development

Run commands from the repository root.

### Examples

`node test/server.js` prints the example links and provides an optional GET and PUT/POST/PATCH API at `/api/tasks`. It keeps records in memory until the server restarts. Use Send tasks in the feature guide to exercise this endpoint; Collections uses browser storage independently.

### Validation

Run `npm run test:setup` once to install Chromium, Firefox, WebKit, their supported platform dependencies, and the Puppeteer browser. `npm test` is the complete test entry point used by CI: it generates/checks types, runs all Node tests, all Chromium tests, HTML-app tests in Firefox and WebKit, native WebMCP checks, and the isolated package-consumer check. The workflow stops at the first failed stage. Missing browsers report errors rather than silently skipping coverage.

For focused checks, `npm run test:html-app` selects HTML-app tests across all three engines. Use `-- --project=webkit` to select one engine.

`npm run types` regenerates declarations and preserves the optional package export. `npm run test:package` packs without lifecycle scripts, installs the tarball offline into a temporary consumer, checks its exports and public types, and runs the installed Todo. It does not publish or change the checkout's dependencies.

`npm run size:html-app` reports source bytes, minified/gzip incremental bytes, its module graph, the separately measured native router and core-entry isolation. Only modules already reachable from the core entry are excluded from the incremental measurement; added core adapters are counted. A separate foundation-only figure excludes all core modules for comparison. WebMCP is an optional core import. The release budget is 12 KiB minified and 5 KiB gzip; `npm run size:html-app -- --check` fails above either limit. Publication runs `npm test` followed by the size gate.
