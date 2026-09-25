# --- Base: dependencies + full source tree -------------------------------
FROM node:18-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# --- Test: base + headless Chromium for Karma ---------------------------
# Used by the `frontend-tests` docker-compose service (see `target: test`).
FROM base AS test

# Chromium is the only extra dependency needed for headless Karma runs.
RUN apk add --no-cache chromium \
    && ln -sf "$(command -v chromium-browser)" /usr/bin/chromium 2>/dev/null || true \
    && ln -sf "$(command -v chromium)" /usr/bin/chromium-browser 2>/dev/null || true

ENV CHROME_BIN=/usr/bin/chromium

CMD ["npm", "test"]

# --- Build: production bundle --------------------------------------------
FROM base AS build

RUN npm run build:prod

# --- Serve stage ---------------------------------------------------------
FROM nginx:1.25-alpine AS serve

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/customer-crud-frontend /usr/share/nginx/html

EXPOSE 80