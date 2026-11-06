"""Checks of workspace preservation, report rendering, and input validation."""
import importlib.util
import json
import shutil
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('lingrev', ROOT / 'bin/lingrev.py')
lingrev = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lingrev)


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='lingrev-test-')
        self.addCleanup(self.tmp.cleanup)
        self.project = Path(self.tmp.name)

    def seed(self):
        (self.project / 'data').mkdir()
        data = json.loads((ROOT / 'examples/review.json').read_text())
        self.save(data)
        shutil.copytree(ROOT / 'examples/figures', self.project / 'figures')
        return data

    def save(self, data):
        (self.project / 'data/review.json').write_text(json.dumps(data))

    def test_init_and_resume_do_not_erase_work(self):
        output = lingrev.initialize(self.project)
        self.assertTrue(output.exists())
        self.assertEqual(lingrev.load(self.project)['findings'], [])
        (self.project / 'review.md').write_text('Author notes')
        with self.assertRaisesRegex(ValueError, 'conflict'):
            lingrev.initialize(self.project)
        self.assertEqual((self.project / 'review.md').read_text(), 'Author notes')
        lingrev.render(self.project)
        self.assertEqual((self.project / 'review.md').read_text(), 'Author notes')

    def test_preflight_conflict_creates_no_partial_workspace(self):
        (self.project / 'brief.md').write_text('Existing brief')
        with self.assertRaises(ValueError):
            lingrev.initialize(self.project)
        self.assertFalse((self.project / 'data').exists())

    def test_existing_agent_instructions_are_preserved(self):
        (self.project / 'utils').mkdir()
        (self.project / 'utils/BOOTSTRAP.md').write_text('kit marker')
        (self.project / 'AGENTS.md').write_text('Existing instructions')
        lingrev.initialize(self.project)
        self.assertEqual((self.project / 'AGENTS.md').read_text(), 'Existing instructions')
        self.assertIn('utils/BOOTSTRAP.md', (self.project / 'CLAUDE.md').read_text())

    def test_example_and_template_validate(self):
        lingrev.validate(json.loads((ROOT / 'templates/review.json').read_text()))
        data = self.seed()
        self.assertEqual(len(lingrev.load(self.project)['findings']), 15)
        bad = json.loads(json.dumps(data))
        bad['findings'].append(bad['findings'][0])
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            lingrev.validate(bad)
        bad = json.loads(json.dumps(data))
        bad['findings'][0]['status'] = 'proved'
        with self.assertRaisesRegex(ValueError, 'invalid status'):
            lingrev.validate(bad)
        bad['findings'][0]['status'] = 'observed'
        bad['findings'][0]['evidence'] = ''
        with self.assertRaisesRegex(ValueError, 'must not be empty'):
            lingrev.validate(bad)

    def test_richer_feedback_requires_provisional_judgments_and_test_plans(self):
        data = self.seed()
        finding = data['findings'][0]
        finding['evidence_kind'] = 'llm judgment'
        with self.assertRaisesRegex(ValueError, 'provisional'):
            lingrev.validate(data)
        finding['status'] = 'concern'
        with self.assertRaisesRegex(ValueError, 'validation plan'):
            lingrev.validate(data)
        finding['validation'] = 'Test the exact contrast with competent speakers.'
        lingrev.validate(data)
        finding['offers'] = [{'title': 'Five abstracts', 'focus': [], 'prompt': 'Draft five versions.'}]
        with self.assertRaisesRegex(ValueError, 'offers.focus'):
            lingrev.validate(data)
        finding['offers'][0]['focus'] = ['Preserve the reported evidence.']
        lingrev.validate(data)
        finding['rewrites'] = [{'label': 'Local edit', 'current': 'Original', 'proposed': '', 'note': ''}]
        with self.assertRaisesRegex(ValueError, 'rewrites.proposed'):
            lingrev.validate(data)

    def test_report_embeds_content_as_data(self):
        data = self.seed()
        attack = '</script><script>alert("unsafe")</script> & <img src=x>'
        data['findings'][0]['evidence'] = attack
        data['summary'] = '__DASHBOARD_JS__'
        self.save(data)
        html = lingrev.render(self.project).read_text()
        self.assertNotIn(attack, html)
        payload = html.split('<script id="review-data" type="application/json">')[1].split('</script>')[0]
        self.assertEqual(json.loads(payload)['findings'][0]['evidence'], attack)
        self.assertEqual(json.loads(payload)['summary'], '__DASHBOARD_JS__')
        self.assertNotIn('src="http', html)
        self.assertNotIn('href="http', html)

    def test_rewrites_and_generation_offers_remain_text_in_report(self):
        data = self.seed()
        attack = '</script><img src=x onerror=alert(1)>'
        finding = data['findings'][0]
        finding['rewrites'] = [{'label': 'A paired rewrite', 'current': attack,
                                'proposed': 'A revised passage', 'note': 'Preserve meaning.'}]
        finding['offers'] = [{'title': 'Five versions', 'focus': [attack],
                              'prompt': 'For F01, draft five versions without adding results.'}]
        self.save(data)
        html = lingrev.render(self.project).read_text()
        self.assertNotIn(attack, html)
        payload = html.split('<script id="review-data" type="application/json">')[1].split('</script>')[0]
        embedded = json.loads(payload)['findings'][0]
        self.assertEqual(embedded['rewrites'][0]['current'], attack)
        self.assertEqual(embedded['offers'][0]['focus'][0], attack)

    def test_local_figures_are_embedded_without_changing_source_paths(self):
        self.seed()
        html = lingrev.render(self.project).read_text()
        payload = html.split('<script id="review-data" type="application/json">')[1].split('</script>')[0]
        figures = [figure for f in json.loads(payload)['findings'] for figure in f.get('figures', [])]
        self.assertTrue(figures)
        self.assertTrue(all(v.startswith('data:image/png;base64,') for f in figures
                            for v in (f['current'], f['proposed']) if v))
        source = lingrev.load(self.project)
        self.assertTrue(any(f.get('figures') for f in source['findings']))
        self.assertNotIn('data:image/png', (self.project / 'data/review.json').read_text())
        finding = source['findings'][0]
        finding['figures'] = [{'label': 'Unsafe', 'current': '../outside.png', 'proposed': '', 'note': ''}]
        with self.assertRaisesRegex(ValueError, 'inside the project'):
            lingrev.validate(source)
        finding['figures'][0]['current'] = 'figures/not-a-png.png'
        (self.project / 'figures/not-a-png.png').write_text('Not a PNG')
        self.save(source)
        before = (self.project / 'report/index.html').read_text()
        with self.assertRaisesRegex(ValueError, 'not a PNG'):
            lingrev.render(self.project)
        self.assertEqual((self.project / 'report/index.html').read_text(), before)

    def test_stale_custom_templates_require_safe_migration(self):
        self.seed()
        output = lingrev.render(self.project)
        before = output.read_text()
        (self.project / 'custom').mkdir()
        current = (ROOT / 'templates/report.html').read_text()
        custom = self.project / 'custom/report.html'
        stale = current.replace('<meta name="lingrev-template" content="2">', '')
        custom.write_text(stale)
        with self.assertRaisesRegex(ValueError, 'older or unsupported'):
            lingrev.render(self.project)
        self.assertEqual(custom.read_text(), stale)
        self.assertEqual(output.read_text(), before)
        custom.write_text(current.replace('id="next-ideas"', 'id="old-help"'))
        with self.assertRaisesRegex(ValueError, 'missing current report elements'):
            lingrev.render(self.project)
        self.assertEqual(output.read_text(), before)

    def test_custom_template_is_used_and_bad_template_preserves_report(self):
        self.seed()
        output = lingrev.render(self.project)
        (self.project / 'custom').mkdir()
        custom = self.project / 'custom/report.html'
        custom.write_text((ROOT / 'templates/report.html').read_text().replace('Review dashboard', 'Custom review'))
        self.assertIn('Custom review', lingrev.render(self.project).read_text())
        before = output.read_text()
        custom.write_text('Broken template')
        with self.assertRaisesRegex(ValueError, 'exactly one'):
            lingrev.render(self.project)
        self.assertEqual(output.read_text(), before)


if __name__ == '__main__':
    unittest.main()
