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
	- `src/assets/files/mss.pdf`

This project no longer relies on root-level `images/` or `files/` folders.

## Local Development
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
```

The build output is generated in `dist/`.

## Deployment
Deployment is handled by GitHub Actions with GitHub Pages.

Workflow: `.github/workflows/deploy.yml`
- Trigger: push to `main` (and manual `workflow_dispatch`)
- Build: install dependencies and run `npm run build`
- Publish: upload `dist/` and deploy with `actions/deploy-pages`
- Custom domain: CI sets `GITHUB_PAGES_CUSTOM_DOMAIN=skinnerdev.com` so generated URLs use root paths (`/`) instead of `/<repo>/`

Astro is configured to handle GitHub Pages project subpaths via dynamic `site` + `base` in `astro.config.mjs`.


## GitHub Stats
![Alt](https://repobeats.axiom.co/api/embed/882d9498f9a558250b00daac71bb076e0a385040.svg "Repobeats analytics image")
