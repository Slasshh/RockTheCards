FROM oven/bun:latest

WORKDIR /usr/src/app

ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3030

COPY package.json bun.lock prisma.config.ts ./
COPY prisma/ ./prisma/
RUN DATABASE_URL="mysql://user:password@127.0.0.1:3306/rockthecards" bun install --frozen-lockfile

# Generate Prisma Client from the schema bundled in this image without
# exposing production credentials at build time.
RUN rm -rf generated/prisma \
    && DATABASE_URL="mysql://user:password@127.0.0.1:3306/rockthecards" bun x --bun prisma generate

COPY app/ ./app/
COPY lib/ ./lib/
COPY public/ ./public/
COPY auth-options.ts ./
COPY next-auth.d.ts ./
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY tsconfig.json ./

# Next imports server modules during the production build, so keep a dummy
# database URL available for modules that validate DATABASE_URL at import time.
RUN DATABASE_URL="mysql://user:password@127.0.0.1:3306/rockthecards" \
    NEXTAUTH_URL="http://localhost:3000" \
    NEXTAUTH_SECRET="build-time-placeholder" \
    bun run build

ENV NODE_ENV=production

EXPOSE 3030

CMD ["sh", "-c", "bun --env-file=.env.production run start"]
