FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY index.html ./
COPY index.tsx ./
COPY App.tsx ./
COPY types.ts ./

# Copy source directories
COPY components ./components
COPY pages ./pages
COPY services ./services
COPY hooks ./hooks
COPY utils ./utils

# Install dependencies
RUN npm ci

# Build with environment variable
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config with API proxy
RUN echo 'upstream backend { \
    server biosynth-backend:3001; \
    keepalive 64; \
} \
\
server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json; \
    \
    # Frontend routes \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # API proxy to backend service \
    location /api { \
        proxy_pass http://backend/api; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_set_header X-Forwarded-Host $host; \
        proxy_set_header X-Forwarded-Port $server_port; \
        proxy_cache_bypass $http_upgrade; \
        \
        # Timeouts for long-running requests \
        proxy_connect_timeout 60s; \
        proxy_send_timeout 60s; \
        proxy_read_timeout 60s; \
        \
        # Don't cache API responses \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
    } \
    \
    # Static assets caching \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

