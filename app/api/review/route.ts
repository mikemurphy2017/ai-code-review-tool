import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewRequestSchema, reviewResponseSchema } from "@/lib/review-schema";

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "issues", "suggestions"],
  properties: {
    summary: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "severity", "suggestedFix"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          lineHint: { type: "string" },
          suggestedFix: { type: "string" },
        },
      },
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

function buildPrompt({
  code,
  language,
  reviewType,
}: z.infer<typeof reviewRequestSchema>) {
  return `You are an expert software engineer performing a ${reviewType} code review.

Rules:
- Analyze the submitted ${language} code.
- Keep feedback concrete and actionable.
- Include specific bug risks when relevant.
- Keep summary to 2-4 sentences.
- Return 3-5 issues when possible.
- Return 3-5 suggestions.
- Use lineHint when you can infer a location (for example "line 12" or "function fetchData").

Code:
${code}`;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = reviewRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing on the server." },
        { status: 500 },
      );
    }

    const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
    const reviewPrompt = buildPrompt(parsed.data);

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You are a strict code reviewer. Return only valid JSON matching the schema.",
              },
            ],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: reviewPrompt }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "code_review",
            schema: outputSchema,
            strict: true,
          },
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return NextResponse.json(
        {
          error: "Failed to get AI review",
          details: errorText,
        },
        { status: 502 },
      );
    }

    const aiJson = (await aiResponse.json()) as {
      output_text?: string;
    };

    if (!aiJson.output_text) {
      return NextResponse.json(
        { error: "AI returned an empty response." },
        { status: 502 },
      );
    }

    const rawReview = JSON.parse(aiJson.output_text);
    const review = reviewResponseSchema.parse(rawReview);

    return NextResponse.json(review, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
