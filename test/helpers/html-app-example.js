/**
 * Exercise CDN-loaded examples with this checkout's modules and no external requests.
 * @param {import('@playwright/test').Page} page
 */
export async function useLocalExampleModules(page) {
  await page.route('https://cdn.jsdelivr.net/**', (route) => {
    let url = new URL(route.request().url());
    if (url.pathname !== '/npm/@symbiotejs/symbiote/html-app/webmcp/+esm') {
      return route.abort();
    }
    let entry = new URL('/html-app/webmcp/index.js', route.request().frame().url()).href;
    return route.fulfill({
      contentType: 'text/javascript',
      headers: {
        'access-control-allow-origin': '*',
      },
      body: 'export * from ' + JSON.stringify(entry) + ';',
    });
  });
}
