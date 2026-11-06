# Contributing

The workspace commands are in `bin/lingrev.py`, the dashboard in `templates/` and `assets/`, and the assistant instructions in `BOOTSTRAP.md` and `METHOD.md`. Edit slide illustrations in `slides/img/`; the release builder embeds them in the deck.

## Check and build

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/test_*.js
python3 bin/build_release.py
```

The site and downloadable kit are built in `dist/`. Pushes to `main` publish this folder with GitHub Pages. Build outputs are ignored.

Keep the example fictional, preserve project files and custom templates, and distinguish observed evidence from suggested checks. See [the data format](docs/data-format.md) before changing report data.
