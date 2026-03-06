FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# We don't expose a port here because docker-compose handles the networking
CMD ["node", "src/server.js"]