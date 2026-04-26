# ── Stage 1: Rust build ──────────────────────────────────────────────────────
FROM rust:bookworm AS rust-builder
WORKDIR /app

# Copy toolchain file first so rustup installs the pinned nightly
COPY rust-toolchain.toml ./

# Cache dependencies separately from source
COPY Cargo.toml Cargo.lock ./
COPY crates/vrearth-core/Cargo.toml       crates/vrearth-core/Cargo.toml
COPY crates/vrearth-server/Cargo.toml     crates/vrearth-server/Cargo.toml
COPY crates/vrearth-wasm/Cargo.toml       crates/vrearth-wasm/Cargo.toml

# Create stub source files for dependency cache layer
RUN mkdir -p crates/vrearth-core/src crates/vrearth-server/src crates/vrearth-wasm/src \
    && echo "pub fn main() {}" > crates/vrearth-server/src/main.rs \
    && echo "" > crates/vrearth-core/src/lib.rs \
    && echo "" > crates/vrearth-wasm/src/lib.rs \
    && cargo build --release -p vrearth-server 2>/dev/null || true

# Now copy actual source and build (touch all .rs so cargo sees the changes)
COPY crates/ ./crates/
RUN find crates -name "*.rs" -exec touch {} \; \
    && cargo build --release -p vrearth-server

# ── Stage 2: Frontend build ───────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

RUN corepack enable

COPY frontend/.npmrc         ./
COPY frontend/package.json   ./
COPY frontend/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# ── Stage 3: Runtime image ────────────────────────────────────────────────────
FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=rust-builder     /app/target/release/vrearth-server ./
COPY --from=frontend-builder /app/frontend/dist                 ./static/

RUN useradd -r -s /bin/false appuser \
    && mkdir -p /app/data \
    && chown -R appuser /app

USER appuser
EXPOSE 3000

ENV RUST_LOG=info
CMD ["./vrearth-server"]
