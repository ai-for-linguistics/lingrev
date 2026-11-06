#!/usr/bin/env python3
"""Initialize a review workspace, check review data, and render an offline report."""
import argparse
import base64
from datetime import date
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys

KIT = Path(__file__).resolve().parent.parent
REPORT_TEMPLATE_VERSION = '2'
TEXT = ('title', 'stage', 'manuscript', 'date', 'goals', 'summary')
LISTS = ('strengths', 'sources', 'coverage', 'checks', 'gaps', 'plan')
FIELDS = ('id', 'category', 'title', 'priority', 'status', 'resolution', 'location',
          'evidence', 'why', 'action', 'effort', 'current', 'proposed', 'rewrite_note', 'prompt')


def validate(data):
    if not isinstance(data, dict):
        raise ValueError('review must be a JSON object')
    if type(data.get('schema_version')) is not int or data['schema_version'] != 1:
        raise ValueError('schema_version must be the integer 1')
    for field in TEXT:
        if not isinstance(data.get(field), str) or not data[field].strip():
            raise ValueError(f'{field} must be a nonempty string')
    for field in LISTS:
        if not isinstance(data.get(field), list) or any(not isinstance(v, str) for v in data[field]):
            raise ValueError(f'{field} must be an array of strings')
    if not isinstance(data.get('findings'), list):
        raise ValueError('findings must be an array')
    seen = set()
    for i, finding in enumerate(data['findings']):
        if not isinstance(finding, dict):
            raise ValueError(f'finding {i + 1} must be an object')
        for field in FIELDS:
            if not isinstance(finding.get(field), str):
                raise ValueError(f'finding {i + 1}: {field} must be a string')
            if field not in ('current', 'proposed', 'rewrite_note') and not finding[field].strip():
                raise ValueError(f'finding {i + 1}: {field} must not be empty')
        ident = finding['id']
        if not re.fullmatch(r'F[0-9]{2,}', ident) or ident in seen:
            raise ValueError(f'invalid or duplicate finding ID: {ident}')
        seen.add(ident)
        for field, choices in [('priority', {'high', 'medium', 'low'}),
                               ('status', {'observed', 'concern', 'suggestion', 'not checked'}),
                               ('resolution', {'open', 'resolved', 'retracted'})]:
            if finding[field] not in choices:
                raise ValueError(f'{ident}: invalid {field}: {finding[field]}')
        # Optional richer feedback remains compatible with version 1 reviews.
        for field in ('evidence_kind', 'validation'):
            if field in finding and (not isinstance(finding[field], str) or not finding[field].strip()):
                raise ValueError(f'{ident}: {field} must be a nonempty string')
        if 'evidence_kind' in finding and finding['evidence_kind'] not in {
                'paper', 'calculation', 'tool check', 'llm judgment', 'author judgment', 'proposal', 'not checked'}:
            raise ValueError(f'{ident}: invalid evidence_kind')
        if finding.get('evidence_kind') == 'llm judgment':
            if finding['status'] == 'observed' or not finding.get('validation', '').strip():
                raise ValueError(f'{ident}: an llm judgment must be provisional and include a validation plan')
        for collection, fields in [('rewrites', ('label', 'current', 'proposed', 'note')),
                                   ('offers', ('title', 'prompt')),
                                   ('figures', ('label', 'current', 'proposed', 'note'))]:
            if collection not in finding:
                continue
            if not isinstance(finding[collection], list):
                raise ValueError(f'{ident}: {collection} must be an array')
            for item in finding[collection]:
                if not isinstance(item, dict):
                    raise ValueError(f'{ident}: each {collection} item must be an object')
                for field in fields:
                    allow_empty = field == 'note' or (collection == 'figures' and field in ('current', 'proposed'))
                    if not isinstance(item.get(field), str) or (not allow_empty and not item[field].strip()):
                        raise ValueError(f'{ident}: {collection}.{field} must be a nonempty string')
                if collection == 'figures':
                    if not item['current'].strip() and not item['proposed'].strip():
                        raise ValueError(f'{ident}: a figure needs a current or proposed image')
                    for field in ('current', 'proposed'):
                        if not item[field]:
                            continue
                        image_path = Path(item[field])
                        if image_path.is_absolute() or '..' in image_path.parts or '://' in item[field]:
                            raise ValueError(f'{ident}: figure paths must stay inside the project')
                        if image_path.suffix.lower() != '.png':
                            raise ValueError(f'{ident}: figure images must be PNG files')
                if collection == 'offers':
                    focus = item.get('focus')
                    if not isinstance(focus, list) or not focus or any(not isinstance(v, str) or not v.strip() for v in focus):
                        raise ValueError(f'{ident}: offers.focus must be a nonempty array of nonempty strings')
    return data


def load(project):
    return validate(json.loads((project / 'data/review.json').read_text(encoding='utf-8')))


def validate_custom_template(html):
    class TemplateInfo(HTMLParser):
        def __init__(self):
            super().__init__()
            self.version = None
            self.ids = set()

        def handle_starttag(self, tag, attributes):
            attributes = dict(attributes)
            if tag == 'meta' and attributes.get('name') == 'lingrev-template':
                self.version = attributes.get('content')
            if 'id' in attributes:
                self.ids.add(attributes['id'])

    actual = TemplateInfo()
    actual.feed(html)
    if actual.version != REPORT_TEMPLATE_VERSION:
        raise ValueError('custom/report.html uses an older or unsupported report template. '
                         'Preserve it, merge its custom content into the current utils/templates/report.html, '
                         'and save the adapted file as custom/report.html. Do not change only the version tag.')
    expected = TemplateInfo()
    expected.feed((KIT / 'templates/report.html').read_text(encoding='utf-8'))
    missing = expected.ids - actual.ids
    if missing:
        raise ValueError('custom/report.html is missing current report elements: ' + ', '.join(sorted(missing)) +
                         '. Preserve the custom file and merge it with the current utils/templates/report.html.')


def render(project):
    data = load(project)
    # Embed local PNGs so the generated report is still a single offline file.
    # Keep source references in review.json; change only this in-memory payload.
    project_root = project.resolve()
    for finding in data['findings']:
        for figure in finding.get('figures', []):
            for field in ('current', 'proposed'):
                if not figure[field]:
                    continue
                image_path = (project_root / figure[field]).resolve()
                if project_root not in image_path.parents:
                    raise ValueError(f"{finding['id']}: figure paths must stay inside the project")
                content = image_path.read_bytes()
                if not content.startswith(b'\x89PNG\r\n\x1a\n'):
                    raise ValueError(f"{finding['id']}: figure file is not a PNG: {figure[field]}")
                figure[field] = 'data:image/png;base64,' + base64.b64encode(content).decode('ascii')
    # Reuse the toolkit's slide illustrations without external file dependencies.
    # These are renderer-owned assets, not image URLs supplied by review data.
    data['_illustrations'] = {
        name: 'data:image/svg+xml;base64,' + base64.b64encode(
            (KIT / 'slides/img' / (name + '.svg')).read_bytes()).decode('ascii')
        for name in ('iterate', 'setup')
    }
    template = project / 'custom/report.html'
    if not template.exists():
        template = KIT / 'templates/report.html'
    html = template.read_text(encoding='utf-8')
    payload = json.dumps(data, ensure_ascii=True).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    replacements = {
        '__REVIEW_DATA__': payload,
        '__DASHBOARD_CSS__': (KIT / 'assets/dashboard.css').read_text(encoding='utf-8'),
        '__DASHBOARD_JS__': (KIT / 'assets/dashboard.js').read_text(encoding='utf-8'),
    }
    # Check the template before substituting. Review text may itself mention markers.
    for marker in replacements:
        if html.count(marker) != 1:
            raise ValueError(f'template must contain exactly one {marker}')
    if template == project / 'custom/report.html':
        validate_custom_template(html)
    html = re.sub('|'.join(map(re.escape, replacements)), lambda m: replacements[m[0]], html)
    output = project / 'report/index.html'
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = output.with_suffix('.html.tmp')
    staging.write_text(html, encoding='utf-8')
    staging.replace(output)
    return output


def initialize(project):
    # Preflight all managed files before creating anything. Never truncate a review.
    managed = ['brief.md', 'data/review.json', 'review.md', 'changes.md', 'report/index.html']
    for name in managed:
        if (project / name).exists():
            raise ValueError(f'initialization conflict: {project / name}; resume instead')
    brief = (KIT / 'templates/review-brief.md').read_text(encoding='utf-8')
    data = (KIT / 'templates/review.json').read_text(encoding='utf-8')
    validate(json.loads(data))
    for name in ('data', 'report', 'custom', 'outputs'):
        (project / name).mkdir(parents=True, exist_ok=True)
    (project / 'brief.md').write_text(brief + '\n## Progress\n\n- Done: Workspace created.\n- Next: Read manuscript and produce first pass.\n- Budget: No extended work agreed.\n', encoding='utf-8')
    (project / 'data/review.json').write_text(data, encoding='utf-8')
    (project / 'review.md').write_text('# Review\n\nAwaiting the assistant’s first pass.\n', encoding='utf-8')
    (project / 'changes.md').write_text(f'# Review changes\n\n- {date.today().isoformat()}: Workspace initialized. No manuscript review performed yet.\n', encoding='utf-8')
    if (project / 'utils/BOOTSTRAP.md').exists():
        for name in ('AGENTS.md', 'CLAUDE.md'):
            pointer = project / name
            if not pointer.exists():
                pointer.write_text('This is a lingrev review workspace.\nRead utils/BOOTSTRAP.md before continuing the review.\n', encoding='utf-8')
    return render(project)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['init', 'check', 'report'])
    parser.add_argument('project', nargs='?', default='.', type=Path)
    args = parser.parse_args()
    project = args.project.resolve()
    try:
        if args.command == 'init':
            print(initialize(project))
        elif args.command == 'check':
            data = load(project)
            print(f"Data structure OK: {len(data['findings'])} findings. Scientific claims are not validated.")
        else:
            print(render(project))
    except (OSError, ValueError) as error:
        print(f'lingrev: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
