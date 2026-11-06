(() => {
  'use strict';
  const ranks = {
    priority: ['high', 'medium', 'low'],
    status: ['observed', 'concern', 'suggestion', 'not checked'],
    resolution: ['open', 'resolved', 'retracted']
  };
  const collator = new Intl.Collator('en', {numeric: true, sensitivity: 'base'});
  // Kept independent of the DOM so review ordering can be checked directly.
  function sortFindings(findings, key = 'priority', direction = 'ascending') {
    return findings.map((finding, index) => ({finding, index}))
      .sort((a, b) => {
        const rank = ranks[key];
        const compared = rank ? rank.indexOf(a.finding[key]) - rank.indexOf(b.finding[key]) : collator.compare(a.finding[key], b.finding[key]);
        return (direction === 'descending' ? -compared : compared) || a.index - b.index;
      }).map(item => item.finding);
  }
  const displayCommentId = id => id.replace(/^F(?=\d{2,}$)/, '#');
  const displayReferences = (value, ids) => value.replace(/\bF\d{2,}\b/g, id => ids.includes(id) ? displayCommentId(id) : id);
  function route(hash, ids) {
    const value = hash.replace(/^#/, '');
    const numeric = /^(?:(?:comments|findings)\/)?#?(\d{2,})$/.exec(value);
    if (numeric && ids.includes(`F${numeric[1]}`)) return {tab: 'findings', finding: `F${numeric[1]}`};
    if (value === 'comments') return {tab: 'findings'};
    const match = /^(?:findings\/)?(F\d{2,})$/.exec(value);
    if (match && ids.includes(match[1])) return {tab: 'findings', finding: match[1]};
    const tab = value === 'findings-section' ? 'findings' : value;
    return {tab: ['overview', 'findings', 'coverage', 'instructions'].includes(tab) ? tab : 'overview'};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {sortFindings, route, displayCommentId, displayReferences};
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  const text = (id, value) => { $(id).textContent = value; };
  const el = (tag, value, cls) => {
    const node = document.createElement(tag);
    if (value !== undefined) node.textContent = value;
    if (cls) node.className = cls;
    return node;
  };
  let data;
  try { data = JSON.parse($('review-data').textContent); }
  catch { text('summary', 'The review data could not be read. Ask your assistant to check and rebuild the report.'); return; }
  const list = (id, values, empty) => $(id).replaceChildren(...(values.length ? values : [empty]).map(v => el('li', v)));
  document.title = `${data.title} · lingrev`;
  text('title', data.title);
  text('meta', `${data.manuscript} · ${data.date}`);
  text('stage', data.stage);
  text('summary', data.summary);
  // Scientific assessment, extensions and checks, visuals, then editorial work.
  const categoryOrder = [
    'Argument', 'Formal analysis', 'Theory', 'Principle clarification', 'Principle improvement',
    'Evidence and results', 'Counterevidence', 'Candidate fact', 'New argument',
    'Cross-linguistic extension', 'Literature', 'New experiment', 'Online analysis',
    'Code and data', 'Analysis', 'Further work', 'Future direction',
    'Plot presentation', 'Additional plot', 'Table presentation',
    'Presentation angles', 'Paper structure', 'Terminology', 'Writing',
    'Local comment', 'Local rewrite', 'Alternative versions'
  ];
  function distribution(id, key, order) {
    const counts = new Map();
    data.findings.forEach(f => counts.set(f[key], (counts.get(f[key]) || 0) + 1));
    const entries = order ? order.map(label => [label, counts.get(label) || 0])
      : [...counts].sort((a, b) => {
        const rank = label => {
          const index = categoryOrder.findIndex(category => category.toLowerCase() === label.toLowerCase());
          return index < 0 ? categoryOrder.length : index;
        };
        return rank(a[0]) - rank(b[0]);
      });
    const maximum = Math.max(1, ...entries.map(([, count]) => count));
    const rows = entries.map(([label, count]) => {
      const row = el('li', undefined, 'bar-row');
      const name = key === 'priority' ? label[0].toUpperCase() + label.slice(1) : label;
      const track = el('span', undefined, 'bar-track');
      track.setAttribute('aria-hidden', 'true');
      const bar = el('span', undefined, `bar-fill${key === 'priority' ? ` bar-${label}` : ''}`);
      bar.setAttribute('style', `width:${count / maximum * 100}%`);
      track.append(bar);
      row.append(el('span', name, 'bar-label'), track, el('span', String(count), 'bar-count'));
      return row;
    });
    $(id).replaceChildren(...(rows.length ? rows : [el('li', 'No comments yet.', 'muted')]));
  }
  distribution('category-chart', 'category');
  distribution('priority-chart', 'priority', ranks.priority);
  text('goals', `Your review goals: ${data.goals}`);
  list('strengths', data.strengths, 'No strengths recorded yet.');
  list('sources', data.sources, 'No sources inspected yet.');
  list('coverage-list', data.coverage, 'No coverage recorded yet.');
  list('checks', data.checks, 'No checks recorded.');
  list('gaps', data.gaps, 'No additional gaps recorded. Coverage above still defines the scope.');
  const ids = data.findings.map(f => f.id);
  function commentId(id) {
    const label = el('span', undefined, 'comment-id');
    label.append(el('small', '#', 'comment-prefix'), document.createTextNode(id.replace(/^F/, '')));
    return label;
  }
  let sortKey = 'priority', sortDirection = 'ascending';
  const entries = new Map();
  const tabNames = ['overview', 'findings', 'coverage', 'instructions'];
  const panelIds = {overview: 'overview', findings: 'findings-section', coverage: 'coverage', instructions: 'instructions'};
  function activateTab(name) {
    tabNames.forEach(tab => {
      const active = name === tab;
      $(`tab-${tab}`).setAttribute('aria-selected', String(active));
      $(`tab-${tab}`).tabIndex = active ? 0 : -1;
      $(panelIds[tab]).hidden = !active;
    });
  }
  function navigate(hash) {
    if (location.hash !== hash) history.pushState(null, '', hash);
    applyRoute();
  }
  tabNames.forEach((name, index) => {
    const tab = $(`tab-${name}`);
    tab.addEventListener('click', () => navigate(`#${name}`));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabNames.length;
      if (event.key === 'ArrowLeft') target = (index + tabNames.length - 1) % tabNames.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabNames.length - 1;
      if (target !== undefined) {
        event.preventDefault();
        $(`tab-${tabNames[target]}`).focus();
        navigate(`#${tabNames[target]}`);
      }
    });
  });
  function expanded(entry, value) {
    entry.detail.hidden = !value;
    entry.row.classList.toggle('is-expanded', value);
    entry.toggle.setAttribute('aria-expanded', String(value));
    entry.icon.textContent = value ? '▾' : '▸';
  }
  function applyRoute() {
    const target = route(location.hash, ids);
    activateTab(target.tab);
    if (target.finding) {
      const entry = entries.get(target.finding);
      expanded(entry, true);
      entry.toggle.focus({preventScroll: true});
      entry.row.scrollIntoView({block: 'nearest'});
    }
  }
  function copyPrompt(container, promptText, label) {
    promptText = displayReferences(promptText, ids);
    label = displayReferences(label, ids);
    const prompt = el('pre', promptText, 'prompt');
    const button = el('button', 'Copy request', 'copy-button'); button.type = 'button';
    button.setAttribute('aria-label', `Copy request: ${label}`);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(promptText);
        text('copy-status', `${label}: request copied. Paste it into the chat.`);
      } catch {
        // Local-file clipboard access varies by browser. Keep the exact request
        // reachable by keyboard even when clipboard or selection APIs are absent.
        prompt.tabIndex = 0;
        prompt.focus();
        let selected = false;
        try {
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange(); range.selectNodeContents(prompt);
            selection.removeAllRanges(); selection.addRange(range);
            selected = true;
          }
        } catch { /* The visible request remains available for manual copying. */ }
        text('copy-status', `${label}: copying is unavailable. ${selected ? 'The request is selected. ' : ''}Copy it manually.`);
      }
    });
    container.append(el('p', 'Instruction you can paste into the chat', 'prompt-label'), prompt, button);
  }
  const ideas = [
    {image: 'setup', alt: 'Talk to the assistant in the chat and read the updated report beside it. Ask questions, refine the work, and repeat.'},
    {image: 'iterate', alt: 'Ways to expand the work and report: scientific checks, rewrites, new formats, and improving the theory.'}
  ];
  if ($('ideas-comments')) $('ideas-comments').addEventListener('click', () => {
    navigate('#findings');
    $('tab-findings').focus();
  });
  if ($('next-ideas')) ideas.forEach(group => {
    const source = data._illustrations?.[group.image];
    if (!/^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+={0,2}$/.test(source || '')) return;
    const figure = el('figure', undefined, 'idea-illustration');
    const image = el('img'); image.src = source; image.alt = group.alt;
    figure.append(image);
    if (group.image === 'iterate') {
      // SVG links are inert inside an img, so make its corner link clickable here.
      const link = el('a', undefined, 'theory-link');
      link.href = 'https://github.com/ai-for-linguistics/linglab';
      link.target = '_blank'; link.rel = 'noopener';
      link.setAttribute('aria-label', 'Check out linglab for developing and testing theories');
      link.title = 'Check out linglab';
      figure.append(link);
    }
    $('next-ideas').append(figure);
  });
  data.findings.forEach(f => {
    const row = el('tr', undefined, 'finding-row'); row.id = f.id;
    const toggle = el('button', undefined, 'finding-toggle'); toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', `detail-${f.id}`);
    const icon = el('span', '▸', 'disclosure-icon'); icon.setAttribute('aria-hidden', 'true');
    toggle.append(icon, el('span', f.title));
    const titleCell = el('td'); titleCell.append(toggle);
    const idCell = el('td'); idCell.append(commentId(f.id));
    row.append(idCell, titleCell, el('td', f.category), el('td', f.priority, `priority-${f.priority}`), el('td', f.status), el('td', f.resolution));
    const detail = el('tr', undefined, 'detail-row'); detail.id = `detail-${f.id}`; detail.hidden = true;
    const cell = el('td'); cell.colSpan = 6;
    const content = el('div', undefined, 'finding-detail');
    const heading = el('h3'); heading.append(commentId(f.id), document.createTextNode(` · ${f.title}`));
    content.append(heading, el('p', f.location, 'detail-meta'));
    [['Evidence / basis', f.evidence], ['How this was obtained', f.evidence_kind], ['What still needs testing', f.validation], ['Why it matters', f.why], ['Next action', f.action], ['Estimated author effort', f.effort]].forEach(([label, value]) => {
      if (value) {
        const paragraph = el('p', undefined, 'comment-field');
        paragraph.append(el('strong', `${label}: `), document.createTextNode(label === 'Evidence / basis' ? value : displayReferences(value, ids)));
        content.append(paragraph);
      }
    });
    const rewrites = f.rewrites?.length ? f.rewrites : (f.current || f.proposed ? [{label: 'Suggested wording', current: f.current, proposed: f.proposed, note: f.rewrite_note}] : []);
    rewrites.forEach(rewrite => {
      content.append(el('h4', rewrite.label));
      const pair = el('div', undefined, 'rewrite');
      [['Current', rewrite.current], ['Proposed', rewrite.proposed]].forEach(([label, value]) => {
        const column = el('div'); column.append(el('h4', label), el('p', value)); pair.append(column);
      });
      content.append(pair);
      if (rewrite.note) content.append(el('p', displayReferences(rewrite.note, ids), 'muted'));
    });
    if (!rewrites.length && f.rewrite_note) content.append(el('p', displayReferences(f.rewrite_note, ids), 'muted'));
    (f.figures || []).forEach(figure => {
      content.append(el('h4', figure.label));
      const comparison = el('div', undefined, `figure-comparison${figure.current ? '' : ' proposed-only'}`);
      [['Current', figure.current], ['Proposed', figure.proposed]].forEach(([label, source]) => {
        if (!source) return;
        const panel = el('figure');
        panel.append(el('figcaption', label));
        // The renderer embeds local PNG files. Never load URLs or interpret markup
        // supplied in review data, including SVG and other data URL formats.
        if (/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(source)) {
          const image = el('img');
          image.src = source;
          image.alt = `${displayCommentId(f.id)}: ${figure.label} — ${label.toLowerCase()} presentation`;
          panel.append(image);
        } else {
          panel.append(el('p', 'Image unavailable. Ask the assistant to rebuild the report.', 'muted'));
        }
        comparison.append(panel);
      });
      content.append(comparison);
      if (figure.note) content.append(el('p', figure.note, 'figure-note'));
    });
    if (f.offers?.length) {
      content.append(el('h4', 'Would you like alternative versions?'), el('p', 'Choose a direction below, or ask for several versions. These are offers for further work.'));
      f.offers.forEach(offer => {
        const block = el('div', undefined, 'offer'); block.append(el('h4', offer.title));
        const focus = el('ul'); offer.focus.forEach(point => focus.append(el('li', point))); block.append(focus);
        copyPrompt(block, offer.prompt, `${f.id}: ${offer.title}`); content.append(block);
      });
    }
    content.append(el('h4', 'Continue this comment'));
    copyPrompt(content, f.prompt, f.id);
    cell.append(content); detail.append(cell);
    const entry = {row, detail, toggle, icon}; entries.set(f.id, entry);
    toggle.addEventListener('click', () => expanded(entry, detail.hidden));
  });
  function updateTable() {
    const ordered = sortFindings(data.findings, sortKey, sortDirection);
    $('findings').replaceChildren(...ordered.flatMap(f => {
      const entry = entries.get(f.id);
      return [entry.row, entry.detail];
    }));
    document.querySelectorAll('th[data-key]').forEach(th => {
      const active = th.dataset.key === sortKey;
      if (active) th.setAttribute('aria-sort', sortDirection); else th.removeAttribute('aria-sort');
      th.querySelector('span').textContent = active ? (sortDirection === 'ascending' ? '↑' : '↓') : '↕';
    });
    $('empty-findings').hidden = data.findings.length > 0;
  }
  document.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.sort;
    sortDirection = key === sortKey && sortDirection === 'ascending' ? 'descending' : 'ascending';
    sortKey = key; updateTable();
  }));
  window.addEventListener('hashchange', applyRoute);
  window.addEventListener('popstate', applyRoute);
  updateTable(); applyRoute();
})();
