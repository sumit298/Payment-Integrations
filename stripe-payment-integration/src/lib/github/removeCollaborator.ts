import { github, GITHUB_OWNER, GITHUB_REPO } from "./client";

export async function removeCollaborator(username: string) {
  try {
    await github.rest.repos.removeCollaborator({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      username,
    });

    return {
      success: true,
      status: "removed",
    };
  } catch (error) {
    console.error("Failed to remove collaborator:", error);

    return {
      success: false,
      status: "failed",
      error,
    };
  }
}
