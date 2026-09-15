---
name: AI provider availability
description: Why CraftCV currently uses a local coach implementation instead of a hosted model.
---

CraftCV currently uses deterministic server-side coaching and CV extraction because the built-in AI integration required an account upgrade and the user declined to provide a provider API key.

**Why:** Keeping the main conversation and CV generation flow functional is more useful than blocking the first build on a paid AI provider or a credential.

**How to apply:** If AI is revisited, add a server-side provider behind the existing chat and generation routes; do not move provider keys into the browser.