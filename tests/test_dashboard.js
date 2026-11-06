const test = require('node:test');
const assert = require('node:assert/strict');
const {sortFindings, route, displayCommentId, displayReferences} = require('../assets/dashboard.js');
const findings = [
  {id:'F10',title:'A proposal',category:'Writing',priority:'low',status:'suggestion',resolution:'resolved'},
  {id:'F02',title:'B concern',category:'Theory',priority:'high',status:'concern',resolution:'open'},
  {id:'F01',title:'C fact',category:'Theory',priority:'high',status:'observed',resolution:'retracted'},
  {id:'F03',title:'D check',category:'Results',priority:'medium',status:'not checked',resolution:'open'}
];
const ids = rows => rows.map(f => f.id);
test('default ordering puts consequential findings first and preserves ties', () => {
  assert.deepEqual(ids(sortFindings(findings)), ['F02','F01','F03','F10']);
  assert.deepEqual(ids(sortFindings(findings, 'priority', 'descending')), ['F10','F03','F02','F01']);
  assert.deepEqual(ids(findings), ['F10','F02','F01','F03']);
});
test('every displayed column can sort in either direction', () => {
  for (const key of ['id','title','category','priority','status','resolution']) {
    const sorted=sortFindings(findings, key);
    assert.equal(sorted.length, findings.length);
    assert.equal(new Set(ids(sorted)).size, findings.length);
  }
  assert.deepEqual(ids(sortFindings(findings, 'id')), ['F01','F02','F03','F10']);
  assert.deepEqual(ids(sortFindings(findings, 'id', 'descending')), ['F10','F03','F02','F01']);
  assert.deepEqual(ids(sortFindings(findings, 'status')), ['F01','F02','F10','F03']);
  assert.deepEqual(ids(sortFindings(findings, 'resolution')), ['F02','F03','F10','F01']);
});
test('tab and finding URLs preserve real panels, including legacy finding links', () => {
  assert.deepEqual(route('#coverage',ids(findings)), {tab:'coverage'});
  assert.deepEqual(route('#instructions',ids(findings)), {tab:'instructions'});
  assert.deepEqual(route('#findings/F02',ids(findings)), {tab:'findings',finding:'F02'});
  assert.deepEqual(route('#F01',ids(findings)), {tab:'findings',finding:'F01'});
  assert.deepEqual(route('#findings-section',ids(findings)), {tab:'findings'});
  assert.deepEqual(route('#findings/F99',ids(findings)), {tab:'overview'});
  assert.deepEqual(route('#not-a-tab',ids(findings)), {tab:'overview'});
});

// Run the actual controller against a small in-memory DOM. This exercises event
// handling and panel/row state without needing an online browser or dependencies.
const fs = require('node:fs');
const vm = require('node:vm');
function dashboard(initialHash = '', input) {
  const nodes = new Map();
  let focused;
  class Element {
    constructor(tag = 'div') { this.tagName = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.hidden = false; this.listeners = {}; this.classList = {toggle() {}}; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(key, value) { this.attributes[key] = value; }
    getAttribute(key) { return this.attributes[key]; }
    removeAttribute(key) { delete this.attributes[key]; }
    addEventListener(event, handler) { this.listeners[event] = handler; }
    focus() { focused = this; }
    scrollIntoView() { this.scrolled = true; }
    querySelector(tag) { return this.children.find(child => child.tagName === tag); }
  }
  const template = fs.readFileSync(require.resolve('../templates/report.html'), 'utf8');
  for (const match of template.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const node = new Element(match[1]);
    node.hidden = /\bhidden\b/.test(match[0]);
    nodes.set(match[2], node);
  }
  const headings = [...template.matchAll(/<th\b[^>]*data-key="([^"]+)"[^>]*>/g)].map(match => {
    const heading = new Element('th'); heading.dataset.key = match[1];
    const button = new Element('button'); button.dataset.sort = match[1];
    heading.append(button, new Element('span')); return heading;
  });
  const data = input || JSON.parse(fs.readFileSync(require.resolve('../examples/review.json'), 'utf8'));
  nodes.get('review-data').textContent = JSON.stringify(data);
  const location = {hash: initialHash};
  const windowListeners = {};
  const window = {addEventListener(name, fn) { windowListeners[name] = fn; }};
  const context = {
    document: {getElementById: id => nodes.get(id), createElement: tag => new Element(tag), createTextNode: text => ({textContent: text}),
      querySelectorAll: selector => selector === 'th[data-key]' ? headings : headings.map(th => th.children[0])},
    location, history: {pushState(_state, _title, hash) { location.hash = hash; }}, window,
    navigator: {clipboard: {async writeText(text) { context.copied = text; }}}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/dashboard.js'), 'utf8'), context);
  return {nodes, headings, context, data, focused: () => focused,
    rows: () => nodes.get('findings').children.filter(row => row.className === 'finding-row')};
}
test('tab events show one panel; arrow navigation moves selection and focus', () => {
  const ui = dashboard();
  const panels = ['overview', 'findings-section', 'coverage', 'instructions'];
  assert.deepEqual(panels.filter(id => !ui.nodes.get(id).hidden), ['overview']);
  ui.nodes.get('tab-coverage').listeners.click();
  assert.deepEqual(panels.filter(id => !ui.nodes.get(id).hidden), ['coverage']);
  assert.equal(ui.nodes.get('tab-coverage').getAttribute('aria-selected'), 'true');
  assert.equal(ui.nodes.get('tab-overview').tabIndex, -1);
  let prevented = false;
  ui.nodes.get('tab-coverage').listeners.keydown({key: 'ArrowRight', preventDefault() { prevented = true; }});
  assert.equal(prevented, true);
  assert.equal(ui.focused(), ui.nodes.get('tab-instructions'));
  assert.deepEqual(panels.filter(id => !ui.nodes.get(id).hidden), ['instructions']);
});
test('expansion survives sorting; deep links reveal and focus the requested finding', () => {
  const ui = dashboard('#findings');
  const row = ui.rows()[0];
  const toggle = row.children[1].children[0];
  const detail = ui.nodes.get('findings').children[1];
  assert.equal(detail.hidden, true);
  toggle.listeners.click();
  assert.equal(detail.hidden, false);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  const idHeading = ui.headings.find(th => th.dataset.key === 'id');
  idHeading.children[0].listeners.click();
  idHeading.children[0].listeners.click();
  assert.equal(idHeading.getAttribute('aria-sort'), 'descending');
  assert.equal(detail.hidden, false);
  assert.deepEqual(ui.rows().map(row => row.id), [...ui.data.findings].sort((a,b) => b.id.localeCompare(a.id, 'en', {numeric:true})).map(f => f.id));
  const target = ui.data.findings[ui.data.findings.length - 1].id;
  const linked = dashboard(`#findings/${target}`);
  const linkedRow = linked.rows().find(row => row.id === target);
  assert.equal(linked.nodes.get('findings-section').hidden, false);
  assert.equal(linked.focused(), linkedRow.children[1].children[0]);
  assert.equal(linked.focused().getAttribute('aria-expanded'), 'true');
  assert.equal(linkedRow.scrolled, true);
});
test('offers copy their exact request and the empty review remains usable', async () => {
  const ui = dashboard('#findings');
  const offer = ui.data.findings.find(f => f.offers?.length);
  assert.ok(offer, 'example demonstrates an offer');
  const rowIndex = ui.nodes.get('findings').children.findIndex(row => row.id === offer.id);
  const detail = ui.nodes.get('findings').children[rowIndex + 1];
  const descendants = node => [node, ...(node.children || []).flatMap(descendants)];
  const copy = descendants(detail).find(node => node.getAttribute?.('aria-label') === `Copy request: ${displayCommentId(offer.id)}: ${offer.offers[0].title}`);
  await copy.listeners.click();
  assert.equal(ui.context.copied, displayReferences(offer.offers[0].prompt, ui.data.findings.map(f => f.id)));
  assert.match(ui.nodes.get('copy-status').textContent, /request copied/);
  const empty = dashboard('', {...ui.data, findings: [], plan: []});
  assert.equal(empty.rows().length, 0);
  assert.equal(empty.nodes.get('empty-findings').hidden, false);
});

test('figure comparisons show paired and proposed-only PNGs without loading arbitrary sources', () => {
  const input = JSON.parse(fs.readFileSync(require.resolve('../examples/review.json'), 'utf8'));
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==';
  input.findings[0].figures = [
    {label: 'Improve the results plot', current: png, proposed: png, note: 'Keep the same data; make uncertainty visible.'},
    {label: 'Add a language comparison', current: '', proposed: png, note: 'A new view of the inspected data.'},
    {label: '<b>Untrusted markup</b>', current: 'https://example.org/tracker.png', proposed: 'data:image/svg+xml;base64,PHN2Zz4=', note: '<script>Do not interpret this.</script>'}
  ];
  const ui = dashboard('#findings', input);
  const all = node => [node, ...(node.children || []).flatMap(all)];
  const id = input.findings[0].id;
  const rowIndex = ui.nodes.get('findings').children.findIndex(row => row.id === id);
  const detail = ui.nodes.get('findings').children[rowIndex + 1];
  const elements = all(detail);
  const images = elements.filter(node => node.tagName === 'img');
  assert.equal(images.length, 3);
  assert.ok(images.every(image => image.src === png && image.alt.startsWith(`${displayCommentId(id)}: `)));
  assert.match(images[0].alt, /current presentation/);
  assert.match(images[1].alt, /proposed presentation/);
  const comparisons = elements.filter(node => node.className?.startsWith('figure-comparison'));
  assert.equal(comparisons[0].children.length, 2);
  assert.equal(comparisons[1].className, 'figure-comparison proposed-only');
  assert.equal(comparisons[1].children.length, 1);
  assert.equal(comparisons[1].children[0].children[0].textContent, 'Proposed');
  assert.equal(all(comparisons[2]).filter(node => node.tagName === 'img').length, 0);
  assert.ok(elements.some(node => node.textContent === '<script>Do not interpret this.</script>'));
});


test('How to points to Comments and presents setup before the broader possibilities', () => {
  const input = JSON.parse(fs.readFileSync(require.resolve('../examples/review.json'), 'utf8'));
  input._illustrations = Object.fromEntries(['iterate', 'setup'].map(name =>
    [name, 'data:image/svg+xml;base64,' + fs.readFileSync(require.resolve(`../slides/img/${name}.svg`)).toString('base64')]));
  const ui = dashboard('#instructions', input);
  const container = ui.nodes.get('next-ideas');
  assert.equal(container.children.length, 2);
  const all = node => [node, ...(node.children || []).flatMap(all)];
  const elements = all(container);
  assert.deepEqual(elements.filter(node => node.tagName === 'img').map(node => node.src), [input._illustrations.setup, input._illustrations.iterate]);
  assert.equal(elements.filter(node => node.tagName === 'details').length, 0);
  const link = elements.find(node => node.className === 'theory-link');
  assert.equal(link.href, 'https://github.com/ai-for-linguistics/linglab');
  assert.equal(link.rel, 'noopener');
  ui.nodes.get('ideas-comments').listeners.click();
  assert.equal(ui.nodes.get('findings-section').hidden, false);
  assert.equal(ui.nodes.get('instructions').hidden, true);
  assert.equal(ui.focused(), ui.nodes.get('tab-findings'));
});

test('current template keeps the agreed views and omits superseded controls', () => {
  const template = fs.readFileSync(require.resolve('../templates/report.html'), 'utf8');
  assert.match(template, /<meta name="lingrev-template" content="2">/);
  for (const marker of ['__DASHBOARD_CSS__', '__REVIEW_DATA__', '__DASHBOARD_JS__']) {
    assert.equal(template.split(marker).length - 1, 1);
  }
  for (const id of ['summary', 'goals', 'strengths', 'next-ideas', 'ideas-comments']) {
    assert.equal(template.split(`id="${id}"`).length - 1, 1);
  }
  for (const id of ['plan', 'print', 'category', 'priority', 'status', 'resolution', 'result-count', 'search', 'reset']) {
    assert.ok(!template.includes(`id="${id}"`), `superseded ${id} control must remain absent`);
  }
  assert.match(template, /id="tab-findings"[^>]*>Comments<\/button>/);
  assert.match(template, /id="tab-instructions"[^>]*>How to<\/button>/);
  assert.match(template, /<h3>Identified strengths<\/h3>/);
});

test('comment discussion uses bold inline labels and retains literal evidence', () => {
  const ui = dashboard('#findings');
  const finding = ui.data.findings[0];
  const rowIndex = ui.nodes.get('findings').children.findIndex(row => row.id === finding.id);
  const detail = ui.nodes.get('findings').children[rowIndex + 1];
  const all = node => [node, ...(node.children || []).flatMap(all)];
  const fields = all(detail).filter(node => node.className === 'comment-field');
  assert.ok(fields.length >= 4);
  assert.ok(fields.every(node => node.tagName === 'p' && node.children[0].tagName === 'strong'));
  const evidence = fields.find(node => node.children[0].textContent === 'Evidence / basis: ');
  assert.equal(evidence.children[1].textContent, finding.evidence);
  assert.equal(ui.nodes.get('goals').textContent, `Your review goals: ${ui.data.goals}`);
});

test('clipboard denial leaves a focused exact request without requiring selection support', async () => {
  const ui = dashboard('#findings');
  ui.context.navigator.clipboard.writeText = async () => { throw new Error('Clipboard unavailable for local file'); };
  ui.context.window.getSelection = () => null;
  const all = node => [node, ...(node.children || []).flatMap(all)];
  const finding = ui.data.findings[0];
  const button = all(ui.nodes.get('findings')).find(node => node.getAttribute?.('aria-label') === `Copy request: ${displayCommentId(finding.id)}`);
  await button.listeners.click();
  assert.equal(ui.focused().tagName, 'pre');
  assert.equal(ui.focused().tabIndex, 0);
  assert.equal(ui.focused().textContent, displayReferences(finding.prompt, ui.data.findings.map(f => f.id)));
  assert.match(ui.nodes.get('copy-status').textContent, /copying is unavailable.*Copy it manually/);
  assert.doesNotMatch(ui.nodes.get('copy-status').textContent, /request is selected/);
});


test('comment IDs use a small hash prefix while stable links and copied references still work', () => {
  const ui = dashboard('#comments/01');
  const row = ui.rows().find(row => row.id === 'F01');
  const id = row.children[0].children[0];
  assert.equal(id.className, 'comment-id');
  assert.equal(id.children[0].tagName, 'small');
  assert.equal(id.children[0].textContent, '#');
  assert.equal(id.children[1].textContent, '01');
  assert.equal(row.children[1].children[0].getAttribute('aria-expanded'), 'true');
  assert.equal(displayReferences('For F01, revisit F02. Preserve F99 as a source reference.', ['F01','F02']), 'For #01, revisit #02. Preserve F99 as a source reference.');
});
