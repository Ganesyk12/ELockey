FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN chown -R 1000:1000 /app/scripts
USER 1000:1000
EXPOSE 5655
CMD ["sh", "-c", "bun scripts/guard.ts --deployed && bun src/server.ts"]
