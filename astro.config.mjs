import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const isUserOrOrgPagesRepo = !!owner && repo?.toLowerCase() === `${owner.toLowerCase()}.github.io`;
const customDomain = (process.env.GITHUB_PAGES_CUSTOM_DOMAIN ?? "")
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");
const hasCustomDomain = customDomain.length > 0;

const site = hasCustomDomain
  ? `https://${customDomain}`
  : isGitHubActions && owner
    ? `https://${owner}.github.io`
    : "https://www.skinnerdev.com";
const base = hasCustomDomain ? "/" : isGitHubActions && repo && !isUserOrOrgPagesRepo ? `/${repo}/` : "/";

export default defineConfig({
  site,
  base,
  integrations: [tailwind()],
});
