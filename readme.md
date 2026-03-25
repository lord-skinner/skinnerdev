# Matthew Skinner's Resume/CV Site

Modernization is now in progress.

This project has been migrated to an Astro + TypeScript + Tailwind foundation while preserving the current single-page CV structure.

## Stack
- Astro
- TypeScript
- Tailwind CSS
- Astro Content Collections (blog-ready)

## Content + Assets
- App source lives in `src/`
- Static/media assets used by pages/components are imported from `src/assets/`
- Current in-use assets:
	- `src/assets/images/`
	- `src/assets/files/resume.tex` — source for the downloadable PDF
	- `public/resume.pdf` — **generated** at build time (not committed); `npm run build` runs `scripts/build-resume-pdf.sh` first

This project no longer relies on root-level `images/` or `files/` folders.

## Local Development
```bash
npm install
npm run build:resume   # optional first time: needs xelatex so the resume download link works in dev
npm run dev
```

TeX Live must include `xelatex` and packages used by `resume.tex` (e.g. MacTeX on macOS, or `texlive-xetex texlive-latex-extra texlive-fonts-extra` on Linux). If `xelatex` is missing but Docker is available, `scripts/build-resume-pdf.sh` uses the `blang/latex` image (override with `TEXLIVE_IMAGE`). GitHub Actions installs TeX via `apt` before `npm run build`, so CI does not use Docker.

## Production Build
```bash
npm run build
```

The build output is generated in `dist/`.

## Deployment
Deployment is handled by GitHub Actions with GitHub Pages.

Workflow: `.github/workflows/deploy.yml`
- Trigger: push to `main` (and manual `workflow_dispatch`)
- Build: install dependencies, install TeX Live (`xelatex`), run `npm run build` (compiles `resume.tex` → `public/resume.pdf`, then Astro)
- Publish: upload `dist/` and deploy with `actions/deploy-pages`
- Custom domain: CI sets `GITHUB_PAGES_CUSTOM_DOMAIN=skinnerdev.com` so generated URLs use root paths (`/`) instead of `/<repo>/`

Astro is configured to handle GitHub Pages project subpaths via dynamic `site` + `base` in `astro.config.mjs`.

## Blog Comments (giscus)
Comments are now integrated on individual blog post pages via giscus.

### Required Setup
1. Enable GitHub Discussions for the repository.
2. Install the giscus GitHub App.
3. Create a Discussions category for blog comments.
4. Get configuration values from https://giscus.app/.

### Environment Variables
Set these public variables before running/building:

```bash
PUBLIC_GISCUS_REPO=owner/repo
PUBLIC_GISCUS_REPO_ID=R_kgDOExample
PUBLIC_GISCUS_CATEGORY=Blog Comments
PUBLIC_GISCUS_CATEGORY_ID=DIC_kwDOExample4CjA
```

For GitHub Pages builds, add the same keys as Repository Variables in GitHub:
Settings -> Secrets and variables -> Actions -> Variables.

The deploy workflow reads them at build time from `.github/workflows/deploy.yml`.

If these are not set, the blog post page will show a non-breaking "not configured" comment message.


## GitHub Stats
![Alt](https://repobeats.axiom.co/api/embed/882d9498f9a558250b00daac71bb076e0a385040.svg "Repobeats analytics image")
