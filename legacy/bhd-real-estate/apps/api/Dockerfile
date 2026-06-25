# BHD Cloud API — production
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3790

RUN mkdir -p /app/data/files

EXPOSE 3790

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
