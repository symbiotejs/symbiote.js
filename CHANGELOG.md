# Changelog

## 3.0.0-rc.1

### ⚠️ Breaking Changes

- **`tplProcessors` renamed to `templateProcessors`.**
  The instance property and its API now use the full name. The `addTemplateProcessor()` method has been removed — use native `Set` methods directly:
  ```js
  // Before (2.x):
  this.addTemplateProcessor(myProcessor);

  // After (3.x):
  this.templateProcessors.add(myProcessor);
  ```

- **`#disconnectTimeout` renamed to `#destroyTimeout`.**
  Internal field renamed for clarity. No public API impact.

- **Computed properties: cross-context requires explicit deps.**
  Computed properties that depend on external named contexts no longer auto-detect dependencies via global scan. Use the new object syntax:
  ```js
  // Before (2.x) — implicit, worked via global scan:
  init$ = {
    '+total': () => this.$['APP/score'] + this.$.local,
  };

  // After (3.x) — explicit deps required:
  init$ = {
    '+total': {
      deps: ['APP/score'],
      fn: () => this.$['APP/score'] + this.$.local,
    },
  };
  ```
  Local computed properties (depending only on same-context props) continue to work with function syntax unchanged.

### Performance

- **Computed properties: per-instance dependency tracking.**
  Replaced global `#processComputed` scan with per-instance local dependency auto-tracking. `read()` now records which local props a computed function accesses, and only affected computeds are recalculated. Benchmarked up to **676x faster** for local computeds, **14x** for sparse scenarios.

- **Microtask batching for computed recalculation.**
  Replaced `setTimeout`-based debounce with `queueMicrotask`, providing predictable async batching and eliminating per-computed timer overhead.

### Added

- **AI_REFERENCE.md** — comprehensive AI context file for code assistants, covering full API surface, template syntax, state management, lifecycle, styling, routing, itemize, and common mistakes.

- **`destructionDelay` instance property.**
  Configurable delay (default `100`ms) before component destruction in `disconnectedCallback`. Override per-component to control cleanup timing:
  ```js
  class MyComponent extends Symbiote {
    destructionDelay = 0; // instant cleanup
  }
  ```

- **`itemizeProcessor-keyed.js` — optional optimized itemize processor.**
  Drop-in replacement with reference-equality fast paths and key-based reconciliation. Up to **3x faster** for appends, **2x** for in-place updates, **32x** for no-ops. Opt-in per component:
  ```js
  import { itemizeProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor-keyed.js';
  import { itemizeProcessor as defaultProcessor } from '@symbiotejs/symbiote/core/itemizeProcessor.js';

  class BigList extends Symbiote {
    constructor() {
      super();
      this.templateProcessors.delete(defaultProcessor);
      this.templateProcessors = new Set([itemizeProcessor, ...this.templateProcessors]);
    }
  }
  ```

### Internal

- Replaced `setTimeout` with `queueMicrotask` in prop binding race avoidance and async accessor handlers.
