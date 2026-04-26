# vrearth

セルフホスト前提・招待制・2D トップダウン視点の小規模ソーシャル空間。
**「友達と過ごす自分のリビング」をデジタルに再現する。**

## Quick Start

```bash
docker compose up
```

ブラウザで `http://localhost:3000` を開く。

## Development

### Prerequisites

- Rust nightly (see `rust-toolchain.toml`)
- Node.js 22+ / pnpm 10+
- Docker / Docker Compose

### Setup

```bash
# Install pre-commit hooks
pre-commit install

# Backend
cargo run -p vrearth-server

# Frontend (別ターミナル)
cd frontend && pnpm install && pnpm dev
```

### Testing

```bash
# Rust
cargo test --workspace

# Frontend
cd frontend && pnpm test

# WASM
wasm-pack test --headless --chrome crates/vrearth-wasm
```

### Security

- npm パッケージは [Takumi Guard](https://flatt.tech/takumi/features/guard) 経由 (`frontend/.npmrc`)
- Rust 依存は `cargo deny` + `cargo audit` で管理 (`deny.toml`)

## Architecture

詳細は [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照。

## License

Apache-2.0
