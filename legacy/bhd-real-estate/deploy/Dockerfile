# BHD Real Estate — production web + SQLite
# Build context: project root (parent of deploy/)
FROM node:22-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY bhd-real-estate.html ./bhd-real-estate.html

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3789
ENV DATABASE_PATH=/app/data/rental.db

EXPOSE 3789

WORKDIR /app/server
CMD ["node", "index.js"]
