import assert from 'node:assert/strict';
import test from 'node:test';
import { parseInitialData } from '../../html-app/initial-data.js';

test('HTML-app accepts JSON data and rejects executable context keys and prototype keys', () => {
  let data = parseInitialData('{"name":"{{literal}}","enabled":false,"items":[{"id":"a"}]}');
  assert.deepEqual(data, {
    name: '{{literal}}',
    enabled: false,
    items: [
      {
        id: 'a',
      },
    ],
  });
  assert.notEqual(parseInitialData('{"items":[]}').items, parseInitialData('{"items":[]}').items);
  for (let text of [
    '{"hasOwnProperty":"overwrite"}',
    '{"child":{"hasOwnProperty":"overwrite"}}',
    '{"toString":"overwrite"}',
    'null',
    '[]',
    'false',
    '{unquoted: true}',
    '{"__proto__":{}}',
    '{"child":{"constructor":{}}}',
    '{"child":[{"prototype":{}}]}',
    '{"OTHER/secret":true}',
    '{"^name":"value"}',
    '{"*name":"value"}',
    '{"@name":"value"}',
    '{"+computed":"value"}',
    '{"--color":"value"}',
  ]) {
    assert.throws(() => parseInitialData(text));
  }
});
