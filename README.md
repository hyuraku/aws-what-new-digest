# AWS What's New Digest

AWS What's New RSSフィードから最新情報を自動収集し、AI要約付きでアーカイブするツール。

## Getting Started

### Installation

```bash
npm install
```

### Configuration

```bash
cp .env.example .env
```

`.env` を編集して OpenAI API キーを設定:

```env
OPENAI_API_KEY=xxxxx
```

### Usage

```bash
npm run collect
```

## For Developers

### Development Setup

```bash
npm install
```

### Test

```bash
npm test
```

### Lint / Format

```bash
npm run lint
npm run format
```

### Build Docs

```bash
npm run docs:build
```

## Architecture

詳細は [ARCHITECTURE.md](./ARCHITECTURE.md) を参照。

## License

MIT
