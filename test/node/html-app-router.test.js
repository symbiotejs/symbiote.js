import assert from 'node:assert/strict';
import test from 'node:test';
import { routingMap } from '../../html-app/router-data.js';
import { parseAction } from '../../html-app/action-data.js';

test('navigation descriptors accept a provider name without arbitrary action or delay syntax', () => {
  assert.deepEqual(parseAction('[navigate]ROUTER'), {
    operation: 'navigate',
    reference: 'ROUTER',
    delay: 0,
  });
  for (let value of [
    '[navigate]',
    '[navigate]ROUTER/route',
    '[navigate-10]ROUTER',
    '[navigate]ROUTER;other',
  ]) {
    assert.throws(() => parseAction(value), TypeError);
  }
});

test('routing configuration clones native JSON descriptors and rejects incompatible or executable input', () => {
  let original = {
    home: {
      title: 'Home',
      default: true,
      screen: 'home',
      src: './home.html',
    },
  };
  let copy = routingMap(original);
  assert.deepEqual(copy, original);
  assert.notEqual(copy, original);
  assert.notEqual(copy.home, original.home);
  for (let map of [
    null,
    [],
    {},
    {
      home: 'Home',
    },
    {
      home: {
        load: '/execute.js',
      },
    },
    {
      home: {
        load: () => {},
      },
    },
    {
      home: {
        title: 2,
      },
    },
    {
      home: {
        src: 42,
      },
    },
    {
      home: {
        default: 'true',
      },
    },
    {
      home: {
        default: true,
        error: true,
      },
    },
    {
      home: {
        pattern: 'relative',
      },
    },
    {
      home: {
        pattern: '/',
      },
      other: {},
    },
    {
      home: {
        default: true,
      },
      other: {
        default: true,
      },
    },
  ]) {
    assert.throws(() => routingMap(map), TypeError);
  }
});
