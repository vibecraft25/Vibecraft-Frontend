FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN npm ci

EXPOSE 22043

CMD ["npm", "run", "dev"]
