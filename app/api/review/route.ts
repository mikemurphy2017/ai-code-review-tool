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
- Return JSON only with this shape:
{
  "summary": "string",
  "issues": [
    {
      "title": "string",
      "description": "string",
      "severity": "low | medium | high",
      "lineHint": "string (optional)",
      "suggestedFix": "string"
    }
  ],
  "suggestions": ["string"]
}

Code:
${code}`;
}

function extractJsonObject(input: string): string {
  const trimmed = input.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return valid JSON.");
  }

  return trimmed.slice(start, end + 1);
}

async function runOpenAiReview(prompt: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing on the server.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
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
          content: [{ type: "input_text", text: prompt }],
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
    throw new Error(`Failed OpenAI request: ${errorText}`);
  }

  const aiJson = (await aiResponse.json()) as {
    output_text?: string;
  };

  if (!aiJson.output_text) {
    throw new Error("OpenAI returned an empty response.");
  }

  return aiJson.output_text;
}

async function runOllamaReview(prompt: string) {
  const endpoint = process.env.OLLAMA_ENDPOINT ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

  const ollamaResponse = await fetch(`${endpoint}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: "json",
      options: {
        temperature: 0.2,
      },
    }),
  });

  if (!ollamaResponse.ok) {
    const errorText = await ollamaResponse.text();
    throw new Error(`Failed Ollama request: ${errorText}`);
  }

  const ollamaJson = (await ollamaResponse.json()) as {
    response?: string;
  };

  if (!ollamaJson.response) {
    throw new Error("Ollama returned an empty response.");
  }

  return ollamaJson.response;
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

    const reviewPrompt = buildPrompt(parsed.data);
    const provider = (process.env.AI_PROVIDER ?? "ollama").toLowerCase();
    const rawText =
      provider === "openai"
        ? await runOpenAiReview(reviewPrompt)
        : await runOllamaReview(reviewPrompt);
    const rawReview = JSON.parse(extractJsonObject(rawText));
    const review = reviewResponseSchema.parse(rawReview);

    return NextResponse.json(review, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
