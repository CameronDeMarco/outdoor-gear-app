FROM node:20-slim
WORKDIR /app

# Prisma needs openssl at build + runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
# Cloud Run sends traffic to $PORT (defaults to 8080)
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "run", "start"]