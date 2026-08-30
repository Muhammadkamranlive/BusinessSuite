FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src
COPY index.js ./

ENV NODE_ENV=production
ENV PORT=8787
ENV EMAIL_DATA_DIR=/data

RUN mkdir -p /data

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "src/index.js"]
