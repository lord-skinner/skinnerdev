import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const isUserOrOrgPagesRepo = !!owner && repo?.toLowerCase() === `${owner.toLowerCase()}.github.io`;

const site = isGitHubActions && owner ? `https://${owner}.github.io` : "https://www.skinnerdev.com";
const base = isGitHubActions && repo && !isUserOrOrgPagesRepo ? `/${repo}/` : "/";

export default defineConfig({
  site,
  base,
  integrations: [tailwind()],
});
