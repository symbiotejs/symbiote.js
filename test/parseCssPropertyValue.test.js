import { expect } from '@esm-bundle/chai';
import { parseCssPropertyValue } from '../utils/parseCssPropertyValue.js';

describe('parseCssPropertyValue', () => {
  it('should convert string numbers to numbers', () => {
    expect(parseCssPropertyValue('0')).to.equal(0);
    expect(parseCssPropertyValue('1')).to.equal(1);
    expect(parseCssPropertyValue('-1')).to.equal(-1);
    expect(parseCssPropertyValue('666')).to.equal(666);
  });

  it('should convert JSON string to JS strings', () => {
    expect(parseCssPropertyValue('"test"')).to.equal('test');
    expect(parseCssPropertyValue('"test with \\"quotes\\""')).to.equal('test with "quotes"');
  });

  it('should accept CSS single quotes ', () => {
    expect(parseCssPropertyValue("'test'")).to.equal('test');
    expect(parseCssPropertyValue('\'test with \\"quotes\\"\'')).to.equal('test with "quotes"');
  });

  // see https://www.w3.org/International/questions/qa-escapes#nutshell
  it('should replace css escaped sequences with js ones', () => {
    expect(parseCssPropertyValue('"\\1111"')).to.equal('ᄑ');
    expect(parseCssPropertyValue('"\\001111"')).to.equal('ᄑ');
    expect(parseCssPropertyValue('"\\001111A"')).to.equal('ᄑA');

    expect(parseCssPropertyValue('"\\1111  c"')).to.equal('ᄑ c');
    expect(parseCssPropertyValue('"\\1111 c"')).to.equal('ᄑc');
    expect(parseCssPropertyValue('"\\1111c"')).to.equal('𑄜');

    expect(parseCssPropertyValue('"\\1111  g"')).to.equal('ᄑ g');
    expect(parseCssPropertyValue('"\\1111 g"')).to.equal('ᄑg');
    expect(parseCssPropertyValue('"\\1111g"')).to.equal('ᄑg');

    expect(parseCssPropertyValue('"\\1111\\1111"')).to.equal('ᄑᄑ');
    expect(parseCssPropertyValue('"\\1111 \\1111"')).to.equal('ᄑᄑ');
    expect(parseCssPropertyValue('"\\1111  \\1111"')).to.equal('ᄑ ᄑ');
  });

  it('should replace CSS new-line separators with plain new-line', () => {
    expect(parseCssPropertyValue('"one \\\n two"')).to.equal('one \n two');
  });

  it('should normalize inner quotes escape', () => {
    expect(parseCssPropertyValue('"attr="value""')).to.equal('attr="value"');
    expect(parseCssPropertyValue('"attr="value""')).to.equal('attr="value"');
    expect(parseCssPropertyValue('"attr=\\"value\\""')).to.equal('attr="value"');
    expect(parseCssPropertyValue('"attr=\\"value\\""')).to.equal('attr="value"');
  });
});
