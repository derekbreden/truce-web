FROM node:22-bookworm-slim

# System libraries required by node-canvas (cairo/pango/jpeg/gif/rsvg/pixman)
# plus the toolchain for building native modules (canvas, bcrypt).
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      pkg-config \
      python3 \
      libcairo2-dev \
      libpango1.0-dev \
      libjpeg-dev \
      libgif-dev \
      librsvg2-dev \
      libpixman-1-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production deps only (better-sqlite3 is a devDependency, used only by tests).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
# Render injects PORT (default 10000); server.js binds to it.
EXPOSE 10000
CMD ["node", "index.js"]
