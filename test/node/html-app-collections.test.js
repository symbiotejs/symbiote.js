import test from 'node:test';
import assert from 'node:assert/strict';
import { appendRecord, prependRecord, collectionData, projectCollection, updateMatching, updateRecord } from '../../html-app/collection-data.js';
import { parseAction } from '../../html-app/action-data.js';

test('collection actions accept fixed operations and local item fields only', () => {
  for (let source of [
    '[append]APP/tasks',
    '[prepend]APP/tasks',
    '[patch-matching]^tasks',
    '[remove-matching]*tasks',
    '[item-pub]title',
    '[item-pub-200]title',
    '[item-toggle]done',
    '[item-remove]',
  ]) {
    assert.doesNotThrow(() => parseAction(source));
  }
  for (let source of [
    '[item-pub]APP/title',
    '[item-toggle]^done',
    '[item-remove]id',
    '[item-remove-20]',
    '[append-10]APP/tasks',
    '[prepend-10]APP/tasks',
    '[prepend]',
    '[patch-matching]',
    '[item-pub]__htmlAppAction0',
  ]) {
    assert.throws(() => parseAction(source), TypeError);
  }
});

test('prepend inserts a cloned record first, preserves existing records and rejects duplicate IDs', () => {
  let original = Object.freeze([
    Object.freeze({
      id: 'existing',
      title: 'Existing',
    }),
  ]);
  let draft = {
    title: 'First',
    labels: [
      'work',
    ],
  };
  let next = prependRecord(original, draft);
  assert.equal(next.length, 2);
  assert.equal(next[0].title, 'First');
  assert.equal(typeof next[0].id, 'string');
  assert.equal(next[1], original[0]);
  assert.notEqual(next[0].labels, draft.labels);
  assert.equal(Object.hasOwn(draft, 'id'), false);
  assert.equal(original.length, 1);
  assert.deepEqual(prependRecord([], {
    id: 'provided',
  }), [
    {
      id: 'provided',
    },
  ]);
  assert.throws(() => prependRecord(original, {
    id: 'existing',
  }), TypeError);
});

test('immutable operations clone new data, preserve untouched fields and validate before changing state', () => {
  let original = Object.freeze([
    Object.freeze({
      id: 'a',
      title: 'Alpha',
      done: false,
    }),
    Object.freeze({
      id: 'b',
      title: 'Beta',
      done: false,
    }),
  ]);
  let draft = {
    title: 'Gamma',
    done: false,
    labels: [
      'work',
    ],
  };
  let appended = appendRecord(original, draft);
  assert.equal(appended.length, 3);
  assert.equal(typeof appended[2].id, 'string');
  assert.equal(appended[0], original[0]);
  assert.notEqual(appended[2].labels, draft.labels);
  assert.equal(Object.hasOwn(draft, 'id'), false);
  let patched = updateRecord(appended, 'a', {
    title: 'Updated',
  });
  assert.equal(original[0].title, 'Alpha');
  assert.equal(patched[1], original[1]);
  assert.equal(updateRecord(patched, 'b', null).length, 2);
  assert.throws(() => updateRecord(original, 'a', {
    id: 'replacement',
  }), TypeError);
  assert.throws(() => updateRecord(original, 'missing', null), TypeError);
  assert.throws(() => appendRecord(original, {
    id: 'a',
  }), TypeError);
});

test('collections reject duplicate IDs, unsafe fields and non-JSON values', () => {
  for (let value of [
    {},
    [
      {
        title: 'Missing',
      },
    ],
    [
      {
        id: '',
      },
    ],
    [
      {
        id: 1,
      },
    ],
    [
      {
        id: 'same',
      },
      {
        id: 'same',
      },
    ],
    [
      {
        id: 'a',
        callback: () => {},
      },
    ],
    [
      {
        id: 'a',
        value: undefined,
      },
    ],
    [
      {
        id: 'a',
        value: new Date(),
      },
    ],
    [
      JSON.parse('{"id":"a","__proto__":{}}'),
    ],
  ]) {
    assert.throws(() => collectionData(value), TypeError);
  }
  let circular = {
    id: 'a',
  };
  circular.self = circular;
  assert.throws(() => collectionData([
    circular,
  ]), TypeError);
});

test('bulk operations use typed AND matches and require explicit nonempty removal criteria', () => {
  let items = [
    {
      id: 'a',
      done: false,
      group: 'work',
    },
    {
      id: 'b',
      done: true,
      group: 'work',
    },
    {
      id: 'c',
      done: false,
      group: 'home',
    },
  ];
  let updated = updateMatching(items, {
    done: false,
    group: 'work',
  }, {
    done: true,
  });
  assert.equal(updated[0].done, true);
  assert.equal(items[0].done, false);
  assert.equal(updated[2], items[2]);
  assert.deepEqual(updateMatching(updated, {
    done: true,
  }).map((item) => item.id), [
    'c',
  ]);
  assert.equal(updateMatching(items, {}, {
    done: true,
  }).every((item) => item.done), true);
  assert.throws(() => updateMatching(items, {}), TypeError);
  assert.throws(() => updateMatching(items, {}, {
    id: 'replacement',
  }), TypeError);
});

test('projections derive typed filters, search and sorting without modifying the source', () => {
  let items = [
    {
      id: 'a',
      title: 'Zulu',
      done: false,
      score: 2,
    },
    {
      id: 'b',
      title: 'Alpha',
      done: true,
      score: 10,
    },
    {
      id: 'c',
      title: 'ALPINE',
      done: false,
      score: 1,
    },
  ];
  assert.deepEqual(projectCollection(items, {
    done: false,
  }, 'al', [
    'title',
  ]).map((item) => item.id), [
    'c',
  ]);
  assert.equal(projectCollection(items, {
    done: 'false',
  }).length, 0);
  assert.deepEqual(projectCollection(items, {}, '', [], {
    field: 'score',
    direction: 'asc',
  }).map((item) => item.id), [
    'c',
    'a',
    'b',
  ]);
  assert.deepEqual(items.map((item) => item.id), [
    'a',
    'b',
    'c',
  ]);
  assert.throws(() => projectCollection(items, {}, 'alpha'), TypeError);
  assert.throws(() => projectCollection(items, {}, '', [], {
    field: 'title',
    direction: 'random',
  }), TypeError);
});
