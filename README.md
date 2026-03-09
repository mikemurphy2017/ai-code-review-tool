# AI Code Review Tool

A polished MVP web app that reviews code with AI and returns structured feedback.

Users can:
- Paste code into a text area
- Upload a single source file (`.js`, `.py`, `.cs`, plus common JS/TS extensions)
- Select language and review mode
- Receive a structured response with:
  - Summary
  - Potential issues with severity (`low`, `medium`, `high`)
  - Suggested improvements

## Tech Stack
- Next.js (App Router, TypeScript)
- Tailwind CSS
- OpenAI Responses API
- Zod validation for request/response safety

## MVP Features
- Input methods:
  - Paste code
  - Upload one file
- Supported languages:
  - JavaScript
  - Python
  - C#
- Review modes:
  - General review
  - Bug finding
  - Readability
  - Performance
- API endpoint:
  - `POST /api/review`
- Structured JSON output rendered in clean result cards
- Loading, empty, and error states
- Mobile-friendly layout

## Local Setup
1. Install dependencies:
```bash
npm install
```
2. Configure environment:
```bash
cp .env.example .env.local
```
3. Set your API key in `.env.local`:
```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```
4. Run the app:
```bash
npm run dev
```
5. Open:
```text
http://localhost:3000
```

## API Contract
`POST /api/review`

Request:
```json
{
  "code": "function hello(){ return 1 }",
  "language": "javascript",
  "reviewType": "general"
}
```

Response:
```json
{
  "summary": "Short summary of the code quality.",
  "issues": [
    {
      "title": "Potential null access",
      "description": "The object may be undefined before property access.",
      "severity": "high",
      "lineHint": "line 12",
      "suggestedFix": "Guard against undefined before reading properties."
    }
  ],
  "suggestions": [
    "Extract repeated logic into a helper function.",
    "Add input validation for edge cases."
  ]
}
```

## Screenshots
- Add screenshot: `docs/screenshot-home.png`
- Add screenshot: `docs/screenshot-results.png`

## Future Roadmap
- File diff view for suggested fixes
- Save review history
- GitHub repo import
- Inline line-by-line annotations
- Auth + user dashboards
- Deployment + usage analytics

