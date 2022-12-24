import { writeFileSync } from "fs";

const token = process.env.IG_TOKEN;

if (typeof token !== "string") {
  console.error("IG_TOKEN environment variable must be set.");
  process.exit(1);
}

const ALLOWED_POST_TYPES = ["IMAGE", "CAROUSEL_ALBUM"];

(async () => {
  const posts = [];

  let page = 1;
  let nextURL = `https://graph.instagram.com/me/media?fields=media_type,media_url,caption,permalink&access_token=${token}`;
  while (typeof nextURL === "string") {
    console.log(`Fetching page ${page}...`);
    const result = await fetch(nextURL).then((r) => r.json());
    posts.push(...result.data);
    nextURL = result.paging?.next;
    page++;
  }

  console.log("Filtering data...");
  const imagePosts = posts.filter((post) =>
    ALLOWED_POST_TYPES.includes(post.media_type)
  );

  const outputPath = new URL("posts.json", import.meta.url);
  console.log(`Writing result to ${outputPath}...`);
  try {
    writeFileSync(outputPath, JSON.stringify(imagePosts));
  } catch (err) {
    console.error(`Could not write to ${outputPath}`);
    console.error(err);
  }
})();
