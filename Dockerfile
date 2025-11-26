
# --- Build Stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Habilitar Corepack e PNPM
RUN corepack enable

# Copiar arquivos de dependências para cache layer
COPY package.json pnpm-lock.yaml ./

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar arquivos de configuração
COPY vite.config.js postcss.config.cjs tailwind.config.js ./

# Definir variáveis de ambiente para produção
ENV NODE_ENV=production
ENV VITE_BACKEND_URL=https://api.bloginfinitoautomatico.com
ENV VITE_API_URL=https://api.bloginfinitoautomatico.com
ENV VITE_APP_NAME="BIA - Blog Infinito Automático"
ENV VITE_ENABLE_PROD_LOGS=false

# Copiar código fonte
COPY . .

# Build da aplicação
RUN pnpm run build

# --- Production Stage ---
FROM nginx:1.27-alpine

# Remover configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Criar configuração otimizada do nginx
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name app.bloginfinitoautomatico.com;
    root /usr/share/nginx/html;
    index index.html;

    # Compressão
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.bloginfinitoautomatico.com;" always;

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Copiar arquivos buildados do stage anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Ajustar permissões básicas
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]