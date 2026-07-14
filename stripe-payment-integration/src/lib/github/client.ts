import { Octokit } from "@octokit/rest";

export const github = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export const GITHUB_OWNER = process.env.GITHUB_OWNER!;
export const GITHUB_REPO = process.env.GITHUB_REPO!;

if (!process.env.GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN is not configured");
}

if (!process.env.GITHUB_OWNER) {
  throw new Error("GITHUB_OWNER is not configured");
}

if (!process.env.GITHUB_REPO) {
  throw new Error("GITHUB_REPO is not configured");
}