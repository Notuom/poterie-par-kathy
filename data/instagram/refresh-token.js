import sodium from "libsodium-wrappers";
import { Octokit } from "@octokit/core";

const igToken = process.env.IG_TOKEN;
const ghToken = process.env.GH_TOKEN;

if (typeof igToken !== "string") {
  console.error("IG_TOKEN environment variable must be set.");
  process.exit(1);
}

if (typeof ghToken !== "string") {
  console.error("GH_TOKEN environment variable must be set.");
  process.exit(1);
}

const octokit = new Octokit({ auth: ghToken });

(async () => {
  // Get repo public key
  let publicKeyResponse;
  try {
    publicKeyResponse = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/secrets/public-key",
      {
        owner: "Notuom",
        repo: "poterie-par-kathy",
      }
    );
  } catch (e) {
    console.error("Could not fetch repo public key", e);
    process.exit(1);
  }
  const { key, key_id } = publicKeyResponse.data;

  // Refresh IG token
  const refreshURL = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${igToken}`;
  const result = await fetch(refreshURL).then((r) => r.json());
  const { access_token } = result;
  if (typeof access_token !== "string") {
    console.error("Could not refresh Instagram token");
    process.exit(1);
  }

  // Encrypt the secret
  let encrypted_value;
  try {
    await sodium.ready;
    const binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
    const binsec = sodium.from_string(access_token);
    const encBytes = sodium.crypto_box_seal(binsec, binkey);
    encrypted_value = sodium.to_base64(
      encBytes,
      sodium.base64_variants.ORIGINAL
    );
  } catch (e) {
    console.error("Could not encrypt secret", e);
  }

  // Update Github environment secret
  try {
    await octokit.request(
      "PUT /repositories/{repository_id}/environments/{environment_name}/secrets/{secret_name}",
      {
        repository_id: "581714328",
        environment_name: "github-pages",
        secret_name: "IG_TOKEN",
        encrypted_value,
        key_id,
      }
    );
  } catch (e) {
    console.error(
      "Could not update Github secret. Manual intervention likely required.",
      e
    );
    process.exit(1);
  }
})();
