FROM node:24-alpine

# Prisma's schema engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npx prisma generate && npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]
