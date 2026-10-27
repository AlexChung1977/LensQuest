# LensQuest Architecture

LensQuest finds visually related images from a query photo and saves selected results to a configured path.

## Runtime topology

```text
[Browser / Electron UI :5173]
        |  multipart upload / proxy fetch
        v
[API Server :8787]
  - POST /v1/search
  - providers: bing → serpapi → local (auto)
  - SQLite jobs + corpus
  - GET /v1/proxy (CORS-safe image bytes)
        |
        +--> Bing Visual Search (optional key)
        +--> SerpAPI Google Lens (optional key + imgbb)
        +--> Local perceptual corpus (aHash over Wikimedia seeds)
```

## Layers

### Web client (`app/src`)

| Layer | Path | Responsibility |
| --- | --- | --- |
| Presentation | `presentation/` | UI, history, settings, session hook |
| Application | `application/` | Query image creation / hashing |
| Domain | `domain/` | Shared models + storage policy |
| Infrastructure | `infrastructure/` | HTTP search client, downloader, file store |

### API server (`server/src`)

| Module | Responsibility |
| --- | --- |
| `providers/` | Pluggable visual search backends |
| `services/searchOrchestrator.ts` | Provider chain + fallback |
| `services/corpus.ts` | Index Wikimedia seeds with aHash |
| `db/` | SQLite jobs + corpus |
| `routes/api.ts` | REST surface |

### Desktop (`desktop/`)

Electron shell with preload IPC:

- `pickDirectory` — native folder dialog
- `saveFiles` — write bytes + manifest to absolute paths

## Save layout

```text
{YYYY-MM-DD}/{queryHash8}/001.jpg
...
manifest-{queryHash8}.json
```

## Configuration

See `.env.example`.

- `SEARCH_PROVIDER=auto|local|bing|serpapi`
- Cloud keys optional; local corpus always available as fallback
