# LensQuest Architecture

LensQuest is a reverse-image search client: upload an image, find visually related images on the web, and save selected results to a configured path.

## Goals

- Run on **Mac** and **mobile** (iOS / Android); this repository ships a **browser MVP** that proves the UI and module boundaries.
- Keep **search**, **download**, and **storage** separable so providers can be swapped (mock → SerpAPI Google Lens / Bing Visual Search).
- Persist a **manifest** next to saved files (source URL, score, relative path).

## High-level flow

```
Input image → Client → (optional API gateway) → Visual search
      → Ranked hits → User preview / select → Download pipeline → File store
```

## Layered modules (`app/src`)

| Layer | Path | Responsibility |
| --- | --- | --- |
| Presentation | `presentation/` | UI shell, drop zone, results grid, settings |
| Application | `application/` | Query-image creation, hashing, session orchestration (via hooks) |
| Domain | `domain/` | `QueryImage`, `SearchHit`, `SaveJob`, `AppSettings`, storage policy |
| Infrastructure | `infrastructure/` | Visual search client, downloader, file store, settings persistence |

### Key interfaces

- `VisualSearchClient.search({ image, maxResults, minScore }) → { jobId, hits }`
- `downloadMany(items, concurrency)` → image bytes
- `saveWithBrowserFileStore(...)` → writes files + `manifest-*.json`

Native Mac / mobile clients should implement the same domain types and a platform `FileStore` (arbitrary path on Mac; sandbox / Files / SAF on mobile).

## Storage policy

| Platform | Path behavior |
| --- | --- |
| Mac | Arbitrary folder (e.g. `~/Pictures/LensQuest`) |
| iOS | App Documents + optional security-scoped directory |
| Android | SAF directory or app-specific external storage |
| Browser (MVP) | File System Access API directory picker, or download fallback |

Suggested relative layout:

```text
{YYYY-MM-DD}/{queryHash8}/{001,002,...}.{ext}
manifest-{queryHash8}.json
```

## Deployment modes

### A. Client + thin backend (recommended MVP)

- Client uploads image to your API.
- API holds provider keys, calls Lens/Bing, normalizes `SearchHit[]`.
- Client downloads and writes files locally.

### B. Search + Mac helper (later)

- Phone starts a search job.
- A Mac LaunchAgent listens and writes into the Mac target folder.

## Current scaffold status

- UI: hero drop zone, search progress, selectable results, settings, save action.
- Search: `MockVisualSearchClient` (picsum placeholders) behind the real interface.
- Save: browser directory write or multi-file download + manifest.

## Next technical steps

1. Replace mock client with a real visual-search adapter (keep interface).
2. Add optional FastAPI / Workers gateway for API keys and rate limits.
3. Port presentation to Flutter (or SwiftUI) reusing the same domain contracts.
4. Add SQLite history of jobs / manifests.
