"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { Language, ReviewResponse, ReviewType } from "@/lib/review-schema";

const languageOptions: Array<{ label: string; value: Language }> = [
  { label: "JavaScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "C#", value: "csharp" },
];

const reviewTypeOptions: Array<{ label: string; value: ReviewType }> = [
  { label: "General Review", value: "general" },
  { label: "Bug Finding", value: "bug-finding" },
  { label: "Readability", value: "readability" },
  { label: "Performance", value: "performance" },
];

const severityClassMap = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-800",
} as const;

function inferLanguageFromFilename(fileName: string): Language | null {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (!extension) {
    return null;
  }

  if (["js", "jsx", "ts", "tsx"].includes(extension)) {
    return "javascript";
  }

  if (extension === "py") {
    return "python";
  }

  if (extension === "cs") {
    return "csharp";
  }

  return null;
}

export default function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("javascript");
  const [reviewType, setReviewType] = useState<ReviewType>("general");
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const codeSizeDisplay = useMemo(() => `${code.length}/20000`, [code.length]);

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileText = await file.text();
    setCode(fileText);

    const inferredLanguage = inferLanguageFromFilename(file.name);
    if (inferredLanguage) {
      setLanguage(inferredLanguage);
    }

    setResult(null);
    setError(null);
  }

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!code.trim()) {
      setError("Please paste code or upload a file before submitting.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          reviewType,
        }),
      });

      const json = (await response.json()) as
        | ReviewResponse
        | { error?: string; details?: unknown };

      if (!response.ok) {
        const fallbackMessage = "Unable to review code right now.";
        const serverMessage =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof json.error === "string"
            ? json.error
            : fallbackMessage;
        setError(serverMessage);
        return;
      }

      setResult(json as ReviewResponse);
    } catch {
      setError("Network error while requesting review.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
          Portfolio MVP
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          AI Code Review Tool
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Paste code or upload one file, choose a review mode, and receive a
          structured code review with severity-ranked issues and concrete fixes.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <form
          onSubmit={handleReviewSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Language</span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Review Type
              </span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
                value={reviewType}
                onChange={(event) =>
                  setReviewType(event.target.value as ReviewType)
                }
              >
                {reviewTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium text-slate-700">
              Code
            </label>
            <textarea
              id="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Paste JavaScript, Python, or C# code here..."
              className="h-72 w-full resize-y rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 font-mono text-sm text-slate-900 outline-none ring-sky-500 transition focus:ring-2"
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Maximum size: 20,000 characters</span>
              <span>{codeSizeDisplay}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-400 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
              Upload Code File
              <input
                type="file"
                className="hidden"
                accept=".js,.jsx,.ts,.tsx,.py,.cs,text/plain"
                onChange={handleFileUpload}
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Reviewing..." : "Review Code"}
            </button>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!result && !isLoading && (
            <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600">
              Your structured review will appear here.
            </div>
          )}

          {isLoading && (
            <div className="flex h-full min-h-48 items-center justify-center text-sm font-medium text-slate-600">
              Analyzing code and building feedback...
            </div>
          )}

          {result && (
            <div className="space-y-5">
              <article className="space-y-2 rounded-xl bg-slate-50 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Summary
                </h2>
                <p className="text-sm text-slate-800">{result.summary}</p>
              </article>

              <article className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Potential Issues
                </h2>
                <div className="space-y-3">
                  {result.issues.map((issue, index) => (
                    <div
                      key={`${issue.title}-${index}`}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {issue.title}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${severityClassMap[issue.severity]}`}
                        >
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{issue.description}</p>
                      {issue.lineHint && (
                        <p className="mt-2 text-xs text-slate-500">
                          Location: {issue.lineHint}
                        </p>
                      )}
                      <p className="mt-2 text-xs font-medium text-slate-700">
                        Suggested fix: {issue.suggestedFix}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Suggested Improvements
                </h2>
                <ul className="space-y-2">
                  {result.suggestions.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
