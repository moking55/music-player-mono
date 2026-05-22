# Frontend (Next.js)
FROM node:20-alpine AS builder
WORKDIR /app

# Build arguments for environment variables
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

# Install dependencies for workspaces
COPY package*.json ./
COPY package-lock.json ./
COPY apps/frontend/package*.json apps/frontend/
COPY packages/shared-types/package*.json packages/shared-types/
RUN npm ci

# Copy source
COPY tsconfig*.json ./
COPY apps/frontend/tsconfig*.json apps/frontend/
COPY apps/frontend/next.config.ts apps/frontend/
COPY apps/frontend/postcss.config.mjs apps/frontend/
COPY apps/frontend/eslint.config.mjs apps/frontend/
# COPY apps/frontend/middleware.ts apps/frontend/
COPY apps/frontend/app apps/frontend/app
COPY apps/frontend/public apps/frontend/public
COPY apps/frontend/src apps/frontend/src
COPY packages/shared-types packages/shared-types

# Build shared workspace package before frontend so shared-types resolves during Next build
RUN npm run build --workspace=shared-types

# Build frontend
RUN npm run build:frontend

# Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install production deps
COPY package*.json ./
COPY package-lock.json ./
COPY apps/frontend/package*.json apps/frontend/
COPY packages/shared-types/package*.json packages/shared-types/
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/apps/frontend/.next apps/frontend/.next
COPY --from=builder /app/packages/shared-types/dist packages/shared-types/dist
COPY apps/frontend/public apps/frontend/public
COPY apps/frontend/next.config.ts apps/frontend/
COPY apps/frontend/package.json apps/frontend/

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "frontend", "--", "--hostname", "0.0.0.0", "--port", "3000"]
