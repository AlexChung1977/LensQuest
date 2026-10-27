# LensQuest Roadmap

## P0 — Browser / Mac-oriented MVP (this PR)

- [x] Project scaffold with layered architecture
- [x] UI: brand hero, drop zone, results, settings, save CTA
- [x] Mock visual search + download + browser file store
- [x] Architecture documentation

## P1 — Real search + mobile paths

- [ ] Wire SerpAPI Google Lens or Bing Visual Search behind `VisualSearchClient`
- [ ] Thin backend for API keys / rate limits
- [ ] iOS Files / Android SAF path pickers in a native or Flutter client

## P2 — Product polish

- [ ] License filters and source attribution UI
- [ ] Naming rules, concurrency, similarity threshold persisted per device
- [ ] Local job history (SQLite)
- [ ] Content-hash dedupe across sessions

## P3 — Cross-device sync

- [ ] Optional Mac helper that consumes jobs started on phone
- [ ] Cloud folder root (iCloud / Drive) as shared logical path
- [ ] Self-hosted CLIP index for private corpora
