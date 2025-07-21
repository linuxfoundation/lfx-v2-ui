# Copyright The Linux Foundation and each contributor to LFX.
# SPDX-License-Identifier: MIT

# Build stage
FROM node:22-alpine AS builder

# Set build environment
ARG BUILD_ENV=production

# Enable Corepack for Yarn
RUN corepack enable

WORKDIR /app

# Copy source code
COPY . .

# Install dependencies
RUN yarn install --immutable

# Build the application
RUN yarn build

# # Production stage
# FROM node:22-alpine

# # Enable Corepack for Yarn
# RUN corepack enable

# WORKDIR /app

# # Copy built assets from builder
# COPY --from=builder /app/apps/lfx-pcc/ ./apps/lfx-pcc
# COPY --from=builder /app/packages ./packages

# # Install only production dependencies
# COPY package.json yarn.lock turbo.json ./
# RUN cd apps/lfx-pcc
# RUN yarn install

# Expose port 4200
EXPOSE 4200

# Start the SSR server
CMD ["yarn", "start:server"]