FROM node:24-alpine
WORKDIR /app

# Prisma's schema engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"]
