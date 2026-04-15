# ThinkCollegeLevel

Personal academic portfolio published at [thinkcollegelevel.com](https://thinkcollegelevel.com). Static site built from structured data — blog posts, research, portfolio, and project showcases generated at build time.

## Site Sections

| Section | Path | Purpose |
|---|---|---|
| About | `/about/` | Background and profile |
| Blog | `/blog/` | Writing and reflections |
| Research | `/research/` | Academic research work |
| Portfolio | `/portfolio/` | Selected work |
| Projects | `/projects/` | Technical projects |
| Awards | `/awards-certifications/` | Certifications and recognition |
| Contact | `/contact/` | Contact information |

## Architecture

Content is defined in `site-data.mjs` as structured JavaScript objects. `build.mjs` reads the data and generates static HTML pages. No framework or runtime dependency — output is plain HTML/CSS.

```
site-data.mjs    ← all content lives here
build.mjs        ← generates static HTML from site-data
assets/          ← shared CSS, fonts, images
index.html       ← homepage (static)
```

## Local Build

```bash
npm install
node build.mjs
```

Open any `.html` file in a browser, or serve the directory locally:

```bash
npx serve .
```

## Deployment

Deployed via GitHub Pages on push to `main`. The `CNAME` file points the custom domain to thinkcollegelevel.com.

## License

MIT