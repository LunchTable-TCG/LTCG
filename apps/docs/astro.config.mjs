import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    starlight({
      title: "LunchTable TCG",
      description: "White-label trading card game platform documentation",
      social: {
        github: "https://github.com/lunchtable-tcg",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Quick Start", slug: "getting-started" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Card Authoring", slug: "guides/card-authoring" },
            { label: "Deployment", slug: "guides/deployment" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Configuration", slug: "reference/config" },
          ],
        },
      ],
    }),
  ],
});
