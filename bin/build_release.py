#!/usr/bin/env python3
"""Build the kit archive and a slides-first folder ready for static hosting."""
from html import escape
from pathlib import Path
import re
import shutil
import tempfile

from lingrev import render
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
# README and slides show the same current workflow instead of drifting mockups.
for source, destination in [('overview.svg', 'workflow.svg'), ('setup.svg', 'setup.svg')]:
    (root / 'docs/img' / destination).write_bytes((root / 'slides/img' / source).read_bytes())
# Keep the public example in sync with the production template and renderer.
with tempfile.TemporaryDirectory(prefix='lingrev-example-build-') as directory:
    project = Path(directory)
    (project / 'data').mkdir()
    (project / 'data/review.json').write_bytes((root / 'examples/review.json').read_bytes())
    shutil.copytree(root / 'examples/figures', project / 'figures')
    (root / 'examples/report.html').write_bytes(render(project).read_bytes())
# Keep the prompt shown in the slides identical to the actual launch prompt.
slides_path = root / 'slides/index.html'
slides = re.sub(r'(<pre id="prompt-text">).*?(</pre>)',
                lambda m: m[1] + escape((root / 'PROMPT.md').read_text().strip()) + m[2],
                slides_path.read_text(), flags=re.S)
def embed_figure(match):
    name, existing = match.group(1), match.group(2)
    figure = (root / 'slides/img' / (name + '.svg')).read_text()
    # Namespace definitions because standalone illustrations share character IDs.
    figure = re.sub(r'id="([^"]+)"', lambda m: 'id="' + name + '-' + m[1] + '"', figure)
    figure = re.sub(r'href="#([^"]+)"', lambda m: 'href="#' + name + '-' + m[1] + '"', figure)
    figure = re.sub(r'url\(#([^)]+)\)', lambda m: 'url(#' + name + '-' + m[1] + ')', figure)
    figure = figure.replace('<svg ', '<svg class="fig" ', 1)
    caption = re.search(r'<figcaption>.*?</figcaption>', existing, re.S)
    return '<figure data-figure="' + name + '">' + figure + (caption[0] if caption else '') + '</figure>'

slides = re.sub(r'<figure data-figure="([a-z]+)">(.*?)</figure>', embed_figure, slides, flags=re.S)
slides_path.write_text(slides)
files = [root / name for name in ('README.md', 'PROMPT.md', 'BOOTSTRAP.md', 'METHOD.md', 'VERSION', 'LICENSE', 'THIRD_PARTY.md')]
for folder in ('assets', 'bin', 'docs', 'examples', 'slides', 'templates', 'tests', 'moves'):
    files.extend(p for p in (root / folder).rglob('*') if p.is_file()
                 and '__pycache__' not in p.parts and p.name != '.DS_Store')
output = root / 'dist/lingrev-beta.zip'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(files):
        relative = path.relative_to(root).as_posix()
        content = path.read_bytes()
        # The extracted kit already contains the kit: no recursive ZIP dependency.
        if relative == 'docs/guide.md':
            content = content.decode().replace('or [archive](../dist/lingrev-beta.zip)', 'containing BOOTSTRAP.md').encode()
        elif relative == 'slides/index.html':
            content = content.decode().replace('href="../dist/lingrev-beta.zip" download>Download kit', 'href="../README.md">Kit instructions').encode()
        archive.writestr('lingrev/' + relative, content)
# Upload dist/ together as a static site when publication is requested.
site_slides = slides.replace('../dist/lingrev-beta.zip', 'lingrev-beta.zip').replace('../PROMPT.md', 'PROMPT.md').replace('../examples/report.html', 'example.html')
(root / 'dist/index.html').write_text(site_slides)
(root / 'dist/PROMPT.md').write_text((root / 'PROMPT.md').read_text())
(root / 'dist/example.html').write_bytes((root / 'examples/report.html').read_bytes())
print(output)
print(root / 'dist/index.html')

(root / 'dist/.nojekyll').touch()
