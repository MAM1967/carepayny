import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Guide pages: one Markdown file per page per language (docs/PRD.md, "Translation plan").
const guide = defineCollection({
  loader: glob({ pattern: "*/cdpap/**/*.md", base: "./src/content" }),   // ids: "<lang>/cdpap/<slug>"
  schema: z.object({
    title: z.string(),
    description: z.string(),
    nav: z.string(),            // short name for the guide menu
    order: z.number(),
    lastChecked: z.string(),
    sources: z.array(z.object({ label: z.string(), url: z.string().url() })).min(1)
  })
});

export const collections = { guide };
