FROM oven/bun:1.4-alpine
WORKDIR /app

ENV MCP_TRANSPORT=http
ENV PORT=3000

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["bun", "run", "src/index.ts", "--http"]
