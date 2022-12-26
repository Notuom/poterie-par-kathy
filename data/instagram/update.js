import { writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import sharp from "sharp";

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

  console.log("Resizing images");
  const finalPosts = await Promise.all(
    imagePosts.map(async (post) => {
      const thumbnailPath = `/images/posts/${post.id}.jpg`;
      const imagePath = fileURLToPath(
        new URL(`../../public/${thumbnailPath}`, import.meta.url)
      );

      if (existsSync(imagePath)) {
        console.log(`Image already exists for post ${post.id}`);
      } else {
        console.log(`Resizing image for post ${post.id}`);
        const buffer = await fetch(post.media_url).then((r) => r.arrayBuffer());
        try {
          await sharp(Buffer.from(buffer)).resize(400, 400).toFile(imagePath);
        } catch (e) {
          console.error("Error writing image to file", imagePath, e);
        }
      }

      return {
        id: post.id,
        caption: post.caption,
        permalink: post.permalink,
        thumbnail: thumbnailPath,
      };
    })
  );

  const outputPath = new URL("posts.json", import.meta.url);
  console.log(`Writing result to ${outputPath}...`);
  try {
    writeFileSync(outputPath, JSON.stringify(finalPosts));
  } catch (e) {
    console.error("Error writing posts file", outputPath, e);
  }
})();
