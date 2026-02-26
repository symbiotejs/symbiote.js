# Animations

Symbiote.js provides CSS-driven exit transitions with zero JS animation code.

## `animateOut`

`animateOut(el)` sets the `[leaving]` attribute on an element, waits for CSS `transitionend`, then removes the element from the DOM. If no CSS transition is defined, removes immediately.

```js
import { animateOut } from '@symbiotejs/symbiote';

// or as a static method:
Symbiote.animateOut(el);
```

## CSS pattern

Use `@starting-style` for enter animations and `[leaving]` for exit:
```css
my-item {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s, transform 0.3s;

  /* Enter (CSS-native, no JS needed): */
  @starting-style {
    opacity: 0;
    transform: translateY(20px);
  }

  /* Exit (triggered by animateOut): */
  &[leaving] {
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

## Itemize integration

Both itemize processors use `animateOut` automatically for item removal. Items with CSS `transition` + `[leaving]` styles will animate out before being removed from the DOM:
```css
user-card {
  opacity: 1;
  transition: opacity 0.3s;

  @starting-style {
    opacity: 0;
  }

  &[leaving] {
    opacity: 0;
  }
}
```

No additional JavaScript is required — just define the CSS transitions and Symbiote handles the rest.

---

Next: [CSS Data →](./css-data.md)
