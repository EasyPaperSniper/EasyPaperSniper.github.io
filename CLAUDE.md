# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal academic research website for Tianyu Li, hosted on GitHub Pages at `EasyPaperSniper.github.io`. Based on [Jon Barron's website template](https://jonbarron.info/).

## Architecture

**No build system.** This is a pure static site — HTML, CSS, and JS served directly by GitHub Pages. There is no package manager, bundler, templating engine, or build step. To preview locally, open `index.html` in a browser or use any static file server.

### Main Page (`index.html`)
- Uses nested HTML `<table>` elements for layout (inherited from Barron template)
- Profile section at top, followed by a grid of research paper entries
- Each paper entry has: video/image thumbnail (240px), title, authors (Tianyu Li bolded), venue, and links (project page, paper, video, code)
- Global styles in `stylesheet.css` (Lato font via Google Fonts)
- Google Analytics tracking via gtag.js

### Project Pages (`projects/{name}/`)
Each research project has its own self-contained directory:
```
projects/{name}/
├── {name}.html (or index.html)
├── optional_paper.pdf
└── static/
    ├── css/    # Bulma CSS framework + FontAwesome + custom index.css
    ├── js/     # jQuery, Bulma carousel/slider plugins, custom index.js
    ├── images/
    └── videos/
```
Project pages use **Bulma CSS framework** with carousel/slider plugins — a different stack from the main page's table-based layout.

### Other Directories
- `data/` — BibTeX `.bib` files for paper citations
- `images/` — Thumbnails and media referenced by `index.html`, organized by project name

## Adding a New Paper to the Main Page

Add a new `<tr>` entry in `index.html` following the existing pattern: a table row with a thumbnail cell (video or image, 240px width) and a description cell with title, authors, venue, and links.

## Adding a New Project Page

Copy an existing project directory (e.g., `projects/AAMDM/`) and modify the HTML content. Each project page is standalone with its own copy of Bulma CSS/JS assets in `static/`.
