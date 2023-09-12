FROM node:20 AS prod-deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM oven/bun:1.0
COPY . .
COPY --from=prod-deps /app/node_modules node_modules
CMD [ "bun", "start" ]
