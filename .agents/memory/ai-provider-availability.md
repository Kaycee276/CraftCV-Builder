---
name: AI provider availability
description: Why CraftCV currently uses a local coach implementation instead of a hosted model.
---

CraftCV uses the user's Gemini API key on the server for coaching and CV extraction; the key is stored as a project secret and is never sent to the browser.

**Why:** The user explicitly chose Gemini and supplied a key after the built-in provider integration was unavailable without an account upgrade.

**How to apply:** Keep Gemini calls behind the existing API routes and preserve the local cookie/session boundary; never expose `GEMINI_API_KEY` in frontend code or logs.