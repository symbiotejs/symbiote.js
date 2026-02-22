/**
 * Animate an element out, then remove it.
 * Sets `[leaving]` attribute, waits for CSS `transitionend`, then calls `.remove()`.
 * If no CSS transition is defined, removes immediately.
 * @param {HTMLElement | Element} el
 * @returns {Promise<void>}
 */
export function animateOut(el) {
  let dur = getComputedStyle(el).transitionDuration;
  if (!dur || dur === '0s') {
    el.remove();
    return Promise.resolve();
  }
  el.setAttribute('leaving', '');
  return new Promise((resolve) => {
    let ms = parseFloat(dur) * (dur.endsWith('ms') ? 1 : 1000);
    let done = () => {
      el.remove();
      resolve();
    };
    el.addEventListener('transitionend', done, { once: true });
    // Fallback timeout in case transitionend doesn't fire:
    setTimeout(done, ms + 50);
  });
}
