export class SourceError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number | null} [status]
   */
  constructor(code, message, status = null) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * @param {string} source
 * @param {string} base
 */
export function sourceURL(source, base) {
  let url;
  try {
    url = new URL(source, base);
  } catch {
    throw new SourceError('INVALID_URL', 'Expected an HTTP(S) source URL.');
  }
  if (!source.trim() || ![
    'http:',
    'https:',
  ].includes(url.protocol) || url.username || url.password) {
    throw new SourceError('INVALID_URL', 'Expected an HTTP(S) URL without embedded credentials.');
  }
  url.hash = '';
  return url.href;
}

/**
 * @param {Element} owner
 */
export function requestLimits(owner) {
  let read = (/** @type {string} */ name, /** @type {number} */ fallback) => {
    let value = owner.hasAttribute(name) ? Number(owner.getAttribute(name)) : fallback;
    if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647) {
      throw new SourceError('INVALID_CONFIG', name + ' must be a positive integer.');
    }
    return value;
  };
  return {
    timeout: read('request-timeout', 15000),
    maxBytes: read('max-bytes', 1048576),
  };
}

/**
 * Shared bounded text transport for JSON sources and authored fragments.
 * @param {string} url
 * @param {{ signal: AbortSignal, timeout: number, maxBytes: number, method?: string, body?: string }} options
 */
export async function fetchSource(url, options) {
  let controller = new AbortController();
  let abort = () => controller.abort(options.signal.reason);
  options.signal.addEventListener('abort', abort, {
    once: true,
  });
  if (options.signal.aborted) {
    abort();
  }
  let timer = setTimeout(() => controller.abort(new SourceError('TIMEOUT', 'The request timed out.')), options.timeout);
  try {
    if (options.body !== undefined && new TextEncoder().encode(options.body).byteLength > options.maxBytes) {
      throw new SourceError('TOO_LARGE', 'The request exceeds max-bytes.');
    }
    let response = await fetch(url, {
      signal: controller.signal,
      method: options.method ?? 'GET',
      body: options.body,
      headers: options.body === undefined ? undefined : {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      redirect: 'error',
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new SourceError('HTTP_ERROR', 'HTTP request failed: ' + response.status + '.', response.status);
    }
    if (Number(response.headers.get('content-length')) > options.maxBytes) {
      throw new SourceError('TOO_LARGE', 'The response exceeds max-bytes.');
    }
    let text = '';
    if (response.body) {
      let reader = response.body.getReader();
      let decoder = new TextDecoder('utf-8', {
        fatal: true,
      });
      let size = 0;
      try {
        while (true) {
          let chunk = await reader.read();
          if (chunk.done) {
            text += decoder.decode();
            break;
          }
          size += chunk.value.byteLength;
          if (size > options.maxBytes) {
            throw new SourceError('TOO_LARGE', 'The response exceeds max-bytes.');
          }
          text += decoder.decode(chunk.value, {
            stream: true,
          });
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    }
    return {
      text,
      status: response.status,
      contentType: response.headers.get('content-type') ?? '',
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw controller.signal.reason;
    }
    if (error instanceof SourceError) {
      throw error;
    }
    throw new SourceError('NETWORK_ERROR', 'The request could not be completed.');
  } finally {
    clearTimeout(timer);
    controller.abort();
    options.signal.removeEventListener('abort', abort);
  }
}

/**
 * @param {Awaited<ReturnType<typeof fetchSource>>} response
 */
export function parseResponseJSON(response) {
  if (!/^[^;]+\/(?:json|[^;]+\+json)(?:;|$)/i.test(response.contentType)) {
    throw new SourceError('INVALID_CONTENT_TYPE', 'Expected a JSON response.');
  }
  try {
    return JSON.parse(response.text);
  } catch {
    throw new SourceError('INVALID_DATA', 'The response is not valid JSON.');
  }
}
