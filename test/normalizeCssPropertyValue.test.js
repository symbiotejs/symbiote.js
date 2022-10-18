import { expect } from '@esm-bundle/chai';
import { normalizeCssPropertyValue } from '../utils/normalizeCssPropertyValue.js';

describe('normalizeCssPropertyValue', () => {
  it('should not touch JSON OK strings', () => {
    expect(normalizeCssPropertyValue('"test"')).to.equal('"test"');
    expect(normalizeCssPropertyValue('"test with "quotes""')).to.equal('"test with "quotes""');
  });

  it('should convert wrapping single quotes to double ones ', () => {
    expect(normalizeCssPropertyValue("'test'")).to.equal('"test"');
    expect(normalizeCssPropertyValue('\'test with "quotes"\'')).to.equal('"test with "quotes""');
  });

  // see https://www.w3.org/International/questions/qa-escapes#nutshell
  it('should replace css escaped sequences with js ones', () => {
    expect(normalizeCssPropertyValue('"\\1111"')).to.equal('"ᄑ"');
    expect(normalizeCssPropertyValue('"\\001111"')).to.equal('"ᄑ"');
    expect(normalizeCssPropertyValue('"\\001111A"')).to.equal('"ᄑA"');

    expect(normalizeCssPropertyValue('"\\1111  c"')).to.equal('"ᄑ c"');
    expect(normalizeCssPropertyValue('"\\1111 c"')).to.equal('"ᄑc"');
    expect(normalizeCssPropertyValue('"\\1111c"')).to.equal('"𑄜"');

    expect(normalizeCssPropertyValue('"\\1111  g"')).to.equal('"ᄑ g"');
    expect(normalizeCssPropertyValue('"\\1111 g"')).to.equal('"ᄑg"');
    expect(normalizeCssPropertyValue('"\\1111g"')).to.equal('"ᄑg"');

    expect(normalizeCssPropertyValue('"\\1111\\1111"')).to.equal('"ᄑᄑ"');
    expect(normalizeCssPropertyValue('"\\1111 \\1111"')).to.equal('"ᄑᄑ"');
    expect(normalizeCssPropertyValue('"\\1111  \\1111"')).to.equal('"ᄑ ᄑ"');
  });
});
