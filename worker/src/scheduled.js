const DISPATCH_URL =
  "https://api.github.com/repos/andreeatcl/SENTINEL/actions/workflows/import-events.yml/dispatches";

// fires every 15 minutes and starts the github actions import by itself
export async function scheduled(_event, env, ctx) {
  ctx.waitUntil(
    fetch(DISPATCH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "sentinel-worker",
      },
      body: JSON.stringify({ ref: "main" }),
    }).then(async (res) => {
      if (!res.ok)
        console.error(
          `import dispatch failed: ${res.status} ${await res.text()}`,
        );
    }),
  );
}
