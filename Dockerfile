FROM node:22-bookworm-slim
RUN npm install --global corepack@0.34.0 && corepack enable
WORKDIR /app
COPY . .
RUN npm run setup && npm run build
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
