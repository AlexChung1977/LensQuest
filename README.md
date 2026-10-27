# LensQuest

以圖找圖：輸入一張圖片，搜尋網路上視覺相關的圖片，並存到你指定的路徑。

## 初版內容

- **UI 原型**（`app/`）：Vite + React + TypeScript
- **分層架構**：presentation / application / domain / infrastructure
- **Mock 視覺搜尋**：可之後替換成 Google Lens / Bing Visual Search adapter
- **儲存**：瀏覽器目錄選擇 API，或下載 fallback，並產生 `manifest`

詳細設計見 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，進度見 [docs/ROADMAP.md](docs/ROADMAP.md)。

## 快速開始

```bash
cd app
npm install
npm run dev
```

開啟終端機顯示的本地網址（預設 `http://localhost:5173`）。

```bash
npm run build   # 型別檢查 + 正式建置
npm run lint    # oxlint
```

## 使用流程

1. 在首頁拖入或選擇一張圖片  
2. 等待 mock 搜尋結果  
3. 勾選要留下的圖片  
4. 按「存到路徑」（可先在「設定」改路徑標籤與門檻）

## 目錄結構

```text
docs/                 架構與 roadmap
app/
  src/
    domain/           領域模型與儲存政策
    application/      查詢圖建立、hash
    infrastructure/   搜尋 / 下載 / 檔案 / 設定
    presentation/     UI 與 session hook
```
