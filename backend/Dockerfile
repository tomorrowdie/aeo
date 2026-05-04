FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev --ignore-scripts
RUN npx prisma generate

COPY . .

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push && node src/index.js"]
