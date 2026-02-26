# --- Stage 1: Builder ---
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

# Copy custom ship SVG to replace airplane
RUN cp /app/public/flight-indicators/img/heading_mechanics.svg /app/node_modules/react-flight-indicators/dist/heading_mechanics~LnEXqkNn.svg || true

RUN bun run build

# --- Stage 2: Production with Nginx ---
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf.default

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
