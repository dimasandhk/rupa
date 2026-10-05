FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
# Env vars are read at runtime; these placeholders only satisfy SvelteKit's build-time validation.
RUN DATABASE_URL=postgres://build@localhost/build ORIGIN=http://localhost BETTER_AUTH_SECRET=build \
	S3_ENDPOINT=http://localhost S3_BUCKET=build S3_ACCESS_KEY=build S3_SECRET_KEY=build \
	pnpm build && pnpm prune --prod

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 BODY_SIZE_LIMIT=30M
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
CMD ["node", "build"]
