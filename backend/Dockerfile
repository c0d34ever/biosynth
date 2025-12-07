FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Note: gemini-service-package is not needed as we use local geminiService.ts

# Copy source code
COPY src ./src

# Build
RUN npm run build
RUN ls -la dist/ || (echo "ERROR: Build failed - dist directory not found!" && ls -la /app && exit 1)
RUN test -f dist/index.js || (echo "ERROR: dist/index.js not found!" && ls -la dist/ && exit 1)

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]

