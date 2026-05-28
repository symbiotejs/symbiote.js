import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { html, RESERVED_ATTRIBUTES } from '../../core/html.js';

describe('html tagged template', () => {

  it('should return plain HTML without interpolations', () => {
    let result = html`<div>hello</div>`;
    assert.equal(result, '<div>hello</div>');
  });

  it('should concatenate string interpolations as-is', () => {
    let name = 'World';
    let result = html`<h1>${name}</h1>`;
    assert.equal(result, '<h1>World</h1>');
  });

  it('should concatenate number interpolations', () => {
    let count = 42;
    let result = html`<span>${count}</span>`;
    assert.equal(result, '<span>42</span>');
  });

  it('should convert object to bind attribute', () => {
    let result = html`<div ${{ textContent: 'myProp' }}></div>`;
    assert.equal(result, '<div  bind="textContent:myProp;"></div>');
  });

  it('should handle multiple bindings in one object', () => {
    let result = html`<div ${{ textContent: 'a', onclick: 'b' }}></div>`;
    assert.equal(result, '<div  bind="textContent:a;onclick:b;"></div>');
  });

  it('should put reserved attributes as direct attributes', () => {
    let result = html`<div ${{ itemize: 'items' }}></div>`;
    assert.equal(result, '<div  itemize="items"></div>');
  });

  it('should put ref as direct attribute', () => {
    let result = html`<input ${{ ref: 'nameInput' }}>`;
    assert.equal(result, '<input  ref="nameInput">');
  });

  it('should put ctx as direct attribute', () => {
    let result = html`<div ${{ ctx: 'gallery' }}></div>`;
    assert.equal(result, '<div  ctx="gallery"></div>');
  });

  it('should mix reserved and binding attributes', () => {
    let result = html`<div ${{ ref: 'el', textContent: 'val' }}></div>`;
    assert.equal(result, '<div  ref="el" bind="textContent:val;"></div>');
  });

  it('should handle multiple interpolations in one template', () => {
    let result = html`<div ${{ textContent: 'a' }}><span ${{ onclick: 'b' }}></span></div>`;
    assert.equal(result, '<div  bind="textContent:a;"><span  bind="onclick:b;"></span></div>');
  });

  it('should expand self-closing custom elements', () => {
    let result = html`<my-component />`;
    assert.equal(result, '<my-component></my-component>');
  });

  it('should expand self-closing custom elements without space before slash', () => {
    let result = html`<my-component/>`;
    assert.equal(result, '<my-component></my-component>');
  });

  it('should not duplicate an existing custom element closing tag', () => {
    let result = html`<my-component/></my-component>`;
    assert.equal(result, '<my-component></my-component>');
  });

  it('should expand self-closing custom elements with attributes', () => {
    let result = html`<my-component data-id="a/b" />`;
    assert.equal(result, '<my-component data-id="a/b"></my-component>');
  });

  it('should expand self-closing custom elements with binding attributes', () => {
    let result = html`<my-component ${{ ref: 'el', textContent: 'label' }} />`;
    assert.equal(result, '<my-component  ref="el" bind="textContent:label;"></my-component>');
  });

  it('should keep non-custom self-closing tags unchanged', () => {
    let result = html`<input ${{ ref: 'nameInput' }} />`;
    assert.equal(result, '<input  ref="nameInput" />');
  });

  it('should mix string and object interpolations', () => {
    let cls = 'active';
    let result = html`<div class="${cls}" ${{ textContent: 'x' }}></div>`;
    assert.equal(result, '<div class="active"  bind="textContent:x;"></div>');
  });

  it('should skip null/undefined values silently without devMessages', () => {
    let result = html`<div>${undefined}</div>`;
    assert.equal(result, '<div></div>');
  });

  it('should handle attribute binding with @ prefix', () => {
    let result = html`<div ${{ '@hidden': 'isHidden' }}></div>`;
    assert.equal(result, '<div  bind="@hidden:isHidden;"></div>');
  });

  it('should handle parent binding with ^ prefix', () => {
    let result = html`<button ${{ onclick: '^handler' }}></button>`;
    assert.equal(result, '<button  bind="onclick:^handler;"></button>');
  });

  it('should handle shared context binding with * prefix', () => {
    let result = html`<div ${{ textContent: '*shared' }}></div>`;
    assert.equal(result, '<div  bind="textContent:*shared;"></div>');
  });

  it('should handle empty template', () => {
    let result = html``;
    assert.equal(result, '');
  });
});

describe('RESERVED_ATTRIBUTES', () => {
  it('should include itemize, item-tag, ref, use-template, ctx', () => {
    assert.ok(RESERVED_ATTRIBUTES.includes('itemize'));
    assert.ok(RESERVED_ATTRIBUTES.includes('item-tag'));
    assert.ok(RESERVED_ATTRIBUTES.includes('ref'));
    assert.ok(RESERVED_ATTRIBUTES.includes('use-template'));
    assert.ok(RESERVED_ATTRIBUTES.includes('ctx'));
  });
});
