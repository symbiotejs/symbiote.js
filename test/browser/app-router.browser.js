import { test, expect } from '@playwright/test';

test.beforeEach(async ({
  page,
}) => {
  await page.goto('/test/browser/fixtures/html-app-sources.html');
});

test('a superseded asynchronous guard cannot publish or redirect over the current route', async ({
  page,
}) => {
  expect(await page.evaluate(async () => {
    let {
      AppRouter,
    } = await import('/core/AppRouter.js');
    history.replaceState(null, '', '?fast');
    let context = AppRouter.initRoutingCtx('NATIVE', {
      slow: {
        title: 'Slow',
      },
      fast: {
        title: 'Fast',
      },
      redirected: {
        title: 'Obsolete redirect',
      },
    });
    let release;
    let remove = AppRouter.beforeRoute((to) => to.route === 'slow'
      ? new Promise((resolve) => { release = resolve; }) : undefined);
    let slow = AppRouter.navigate('slow');
    await AppRouter.navigate('fast');
    release('redirected');
    await slow;
    remove();
    return {
      route: context.read('route'),
      title: document.title,
      search: location.search,
    };
  })).toEqual({
    route: 'fast',
    title: 'Fast',
    search: '?fast',
  });
});

test('stale lazy loader success or failure cannot replace a newer navigation', async ({
  page,
}) => {
  expect(await page.evaluate(async () => {
    let {
      AppRouter,
    } = await import('/core/AppRouter.js');
    history.replaceState(null, '', '?fast');
    let resolve;
    let reject;
    let context = AppRouter.initRoutingCtx('NATIVE', {
      slow: {
        title: 'Slow',
        load: () => new Promise((done) => { resolve = done; }),
      },
      failure: {
        title: 'Failure',
        load: () => new Promise((done, fail) => { reject = fail; }),
      },
      fast: {
        title: 'Fast',
      },
      error: {
        title: 'Error',
        error: true,
      },
    });
    let slow = AppRouter.navigate('slow');
    await AppRouter.navigate('fast');
    resolve();
    await slow;
    let afterSuccess = context.read('route');
    let failed = AppRouter.navigate('failure');
    await AppRouter.navigate('fast');
    reject(new Error('Old failure'));
    await failed;
    return {
      afterSuccess,
      afterFailure: context.read('route'),
      title: document.title,
    };
  })).toEqual({
    afterSuccess: 'fast',
    afterFailure: 'fast',
    title: 'Fast',
  });
});

test('map replacement invalidates pending navigation and an aborted context listener stays inactive', async ({
  page,
}) => {
  expect(await page.evaluate(async () => {
    let {
      AppRouter,
    } = await import('/core/AppRouter.js');
    let {
      PubSub,
    } = await import('/core/PubSub.js');
    history.replaceState(null, '', '?ready');
    let controller = new AbortController();
    let context = AppRouter.initRoutingCtx('NATIVE', {
      ready: {
        title: 'Ready',
      },
      pending: {
        title: 'Pending',
      },
    }, {
      signal: controller.signal,
    });
    let release;
    let remove = AppRouter.beforeRoute((to) => to.route === 'pending'
      ? new Promise((resolve) => { release = resolve; }) : undefined);
    let pending = AppRouter.navigate('pending');
    AppRouter.setRoutingMap({
      replacement: {
        default: true,
        title: 'Replacement',
      },
    }, true);
    await AppRouter.navigate('replacement');
    release();
    await pending;
    remove();
    let replacement = context.read('route');
    controller.abort();
    AppRouter.setRoutingMap({
      another: {
        title: 'Another',
      },
    });
    await AppRouter.navigate('another');
    return {
      replacement,
      stopped: context.read('route') === replacement,
      ownedContextPreserved: PubSub.getCtx('NATIVE', false) === context,
    };
  })).toEqual({
    replacement: 'replacement',
    stopped: true,
    ownedContextPreserved: true,
  });
});

test('invalid patterns leave the current native route map usable', async ({
  page,
}) => {
  expect(await page.evaluate(async () => {
    let {
      AppRouter,
    } = await import('/core/AppRouter.js');
    history.replaceState(null, '', '/ready');
    let context = AppRouter.initRoutingCtx('NATIVE', {
      ready: {
        pattern: '/ready',
        title: 'Ready',
      },
    });
    let failed = false;
    try {
      AppRouter.setRoutingMap({
        invalid: {
          pattern: '/[',
        },
      }, true);
    } catch {
      failed = true;
    }
    await AppRouter.navigate('ready');
    return {
      failed,
      route: context.read('route'),
      pattern: AppRouter.appMap.ready.pattern,
      title: document.title,
    };
  })).toEqual({
    failed: true,
    route: 'ready',
    pattern: '/ready',
    title: 'Ready',
  });
});

test('native URL reading handles unescaped query question marks and rejects malformed encoding', async ({
  page,
}) => {
  expect(await page.evaluate(async () => {
    let {
      AppRouter,
    } = await import('/core/AppRouter.js');
    AppRouter.setRoutingMap({
      'some route': {
        title: 'Encoded route',
      },
    });
    await AppRouter.navigate('some route', {
      term: 'a?b',
    });
    return {
      direct: AppRouter.readAddressBar(new URL('?some%20route&term=a?b', location.href)),
      malformed: AppRouter.readAddressBar(new URL('?some%20route&term=%XX', location.href)),
    };
  })).toEqual({
    direct: {
      route: 'some route',
      options: {
        term: 'a?b',
      },
    },
    malformed: {
      route: null,
      options: {},
    },
  });
});
