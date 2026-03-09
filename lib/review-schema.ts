import { z } from "zod";

export const languageSchema = z.enum(["javascript", "python", "csharp"]);
export const reviewTypeSchema = z.enum([
  "general",
  "bug-finding",
  "readability",
  "performance",
]);

export const reviewRequestSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(20000, "Code exceeds 20,000 characters"),
  language: languageSchema,
  reviewType: reviewTypeSchema,
});

export const issueSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
  lineHint: z.string().min(1).optional(),
  suggestedFix: z.string().min(1),
});

export const reviewResponseSchema = z.object({
  summary: z.string().min(1),
  issues: z.array(issueSchema).max(8),
  suggestions: z.array(z.string().min(1)).max(8),
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type ReviewType = z.infer<typeof reviewTypeSchema>;
export type Language = z.infer<typeof languageSchema>;
