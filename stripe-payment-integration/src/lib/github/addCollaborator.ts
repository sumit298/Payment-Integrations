import { github, GITHUB_OWNER, GITHUB_REPO } from "./client";

export async function addCollaborator(username: string) {
  try {
    const response = await github.rest.repos.addCollaborator({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      username,
      permission: "pull",
    });

    return {
      success: true,
      invitationId: response.data.id ?? null,
      status: response.status === 201 ? "invited" : "already_exists",
    };
  } catch (error) {
    console.error("Failed to add collaborator:", error);

    return {
      success: false,
      invitationId: null,
      status: "failed",
      error,
    };
  }
}
