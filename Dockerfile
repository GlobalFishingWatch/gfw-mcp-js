FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/bin.js", "mcp-server"]
