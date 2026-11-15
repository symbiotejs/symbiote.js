import { AppRouter } from '../core/AppRouter.js';
import { PubSub } from '../core/PubSub.js';
import { controlValue, resolveData } from './action-data.js';
import { cloneData, recordData } from './collection-data.js';

/**
 * The fixed framework handler delegates to the connected router owner.
 * @param {import('./BaseClass.js').BaseClass} owner
 * @param {string} reference
 * @param {Element} element
 * @param {Element} operand
 * @param {import('./actions.js').ActionEvent} event
 * @returns {ReturnType<typeof AppRouter.navigate> | undefined}
 */
export function navigateAction(owner, reference, element, operand, event) {
  let anchor = element instanceof HTMLAnchorElement ? element : null;
  if (anchor && (event.button && event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
    || anchor.hasAttribute('download') || anchor.target && anchor.target !== '_self'
    || anchor.getAttribute('href')?.trim().startsWith('#'))) {
    return;
  }
  let route;
  let options = {};
  if (anchor) {
    if (!anchor.hasAttribute('href')) {
      return;
    }
    let url = new URL(anchor.href);
    if (url.hash || url.origin !== owner.ownerDocument.defaultView.location.origin) {
      return;
    }
    let match = AppRouter.readAddressBar(url);
    if (!match.route || !Object.hasOwn(AppRouter.appMap, match.route)) {
      return;
    }
    if (!AppRouter.appMap[match.route].pattern && url.pathname !== owner.ownerDocument.defaultView.location.pathname) {
      return;
    }
    route = match.route;
    options = match.options;
  } else {
    let value = controlValue(operand, '');
    if (value.skip) {
      return;
    }
    route = value.value;
  }
  let data = operand.getAttribute('action-data') ?? element.getAttribute('action-data');
  if (data !== null) {
    let source = resolveData(owner, data, true);
    options = {
      ...options,
      ...recordData(source.ctx.read(source.name)),
    };
  }
  options = cloneData(recordData(options));
  if (Object.values(options).some((value) => value !== null && typeof value === 'object')) {
    throw new TypeError('Route URL options must be JSON scalar values.');
  }
  let context = PubSub.getCtx(reference, false);
  let navigate = context?.read('__htmlAppNavigate');
  if (typeof navigate !== 'function') {
    throw new TypeError('navigate requires a connected sym-router: ' + reference);
  }
  if (typeof route !== 'string' || !Object.hasOwn(AppRouter.appMap, route)) {
    throw new TypeError('navigate requires a configured route name.');
  }
  anchor && event.preventDefault?.();
  return navigate(route, options);
}
