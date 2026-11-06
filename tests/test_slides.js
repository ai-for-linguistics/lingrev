const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('the slide Comments demo expands, collapses, and supports keyboard activation', () => {
  const source = fs.readFileSync(require.resolve('../slides/index.html'), 'utf8');
  const start = source.indexOf("document.querySelectorAll('figure[data-figure=\"evidence\"] svg')");
  const end = source.indexOf(' const prev=', start);
  assert.ok(start >= 0 && end > start, 'interactive figure controller exists');
  const node = () => ({attributes: {}, style: {}, handlers: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.handlers[name] = handler; }});
  const detail = node();
  const content = [node(), node(), node()];
  const rows = [node(), node(), node()].map(row => {
    row.title = {textContent: ''}; row.querySelector = () => row.title; return row;
  });
  const svg = {
    querySelectorAll(selector) { return selector === '[data-comment-row]' ? rows : content; },
    querySelector() { return detail; }
  };
  vm.runInNewContext(source.slice(start, end), {document: {querySelectorAll() { return [svg]; }}});
  rows[1].handlers.click();
  assert.equal(rows[1].attributes['aria-expanded'], 'true');
  assert.equal(rows[0].attributes['aria-expanded'], 'false');
  assert.equal(rows[2].attributes.transform, 'translate(0 341)');
  assert.equal(content[1].style.display, '');
  assert.equal(content[0].style.display, 'none');
  assert.equal(detail.attributes.transform, 'translate(0 195)');
  rows[1].handlers.click();
  assert.equal(detail.style.display, 'none');
  assert.ok(rows.every(row => row.attributes['aria-expanded'] === 'false'));
  let prevented = false, stopped = false;
  rows[2].handlers.keydown({key: ' ', preventDefault() { prevented = true; }, stopPropagation() { stopped = true; }});
  assert.ok(prevented && stopped, 'Space expands the row without advancing the slide');
  assert.equal(rows[2].attributes['aria-expanded'], 'true');
  assert.equal(detail.style.display, '');
  assert.match(rows[2].title.textContent, /Fix Principle A/);
});
