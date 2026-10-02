# Personal website maintenance

This is Tianyu Li's static GitHub Pages website. The current homepage is
`index.html`, using Tailwind CDN and inline styles. No build step is required.

## CV

- The CV must remain a compact one- or two-page document with its original
  structure, using the blog's Geist font only. Do not add website navigation,
  a table of contents, theme controls, or a large hero.
  `cv/index.html` is the HTML source; `cv/build_pdf.py` generates
  `output/pdf/Tianyu-Li-CV.pdf` (requires reportlab, fonttools, and brotli).
  Do not display a CV link on the homepage. Keep both versions aligned with the LaTeX CV.
- Preserve the distinction between submissions and published work. The HTML CV
  currently follows the active LaTeX content (not commented-out sections).
- Keep the CV in `_Resume__Tianyu_Resume/` updated alongside relevant changes to
  employment, education, publications, awards, and service on the website.
- `main.tex` is the entry point and includes the individual section `.tex` files.
- Use confirmed information from the user or repository. Ask about conflicting
  facts rather than inventing dates, titles, or achievements.
- When changing the LaTeX CV, compile and inspect the resulting PDF if a LaTeX toolchain
  is available; otherwise report that compilation was not verified.

## Publications

- Keep the category controls in this order: Highlights, Blog Post, Research Paper.
- Highlights shows entries explicitly marked with `data-highlight="true"`.
- Blog posts live in `projects/blog_post/<slug>/` and are linked from the homepage
  with `data-category="blog"`. Existing paper entries default to the paper category.
- Preserve the supplied post content when updating the homepage listing.
