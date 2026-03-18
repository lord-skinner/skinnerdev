# Copilot Instructions For This Repository

## Project Context
- Framework: Astro + TypeScript + Tailwind
- Main app code is in `src/`
- Blog content is in `src/content/blog/`
- Profile/CV data is in `src/data/profile.ts`

## Asset Conventions
- Keep app assets in `src/assets/` and import them in Astro components/pages.
- Do not introduce new root-level `images/` or `files/` directories.
- Prefer explicit imports (`?url` when needed) over hardcoded absolute paths.

## URL + Routing Conventions
- This site deploys to GitHub Pages using `.github/workflows/deploy.yml`.
- Preserve the dynamic `site` and `base` logic in `astro.config.mjs`.
- Avoid hardcoded root URLs for internal routes/assets when authoring templates.

## Deployment Notes
- CI builds with Node 20 and publishes the `dist/` artifact to GitHub Pages.
- If deployment changes are needed, update both the workflow and `readme.md`.

## Editing Guidance
- Keep changes minimal and scoped to the requested task.
- Preserve existing naming and layout patterns unless there is a clear reason to refactor.
- Run `npm run build` after meaningful changes to validate output.
