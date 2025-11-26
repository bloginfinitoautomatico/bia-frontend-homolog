
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

# Criar configuração otimizada para produção
RUN echo 'server {\
    listen 80;\
    server_name app.bloginfinitoautomatico.com;\
    root /usr/share/nginx/html;\
    index index.html;\
\
    gzip on;\
    gzip_vary on;\
    gzip_min_length 1024;\
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;\
\
    add_header X-Frame-Options "SAMEORIGIN" always;\
    add_header X-XSS-Protection "1; mode=block" always;\
    add_header X-Content-Type-Options "nosniff" always;\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\
    add_header Content-Security-Policy "default-src '"'"'self'"'"'; script-src '"'"'self'"'"' '"'"'unsafe-inline'"'"' '"'"'unsafe-eval'"'"'; style-src '"'"'self'"'"' '"'"'unsafe-inline'"'"'; img-src '"'"'self'"'"' data: https:; font-src '"'"'self'"'"' data:; connect-src '"'"'self'"'"' https://api.bloginfinitoautomatico.com;" always;\
\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {\
        expires 1y;\
        add_header Cache-Control "public, immutable";\
        access_log off;\
    }\
\
    location / {\
        try_files $uri $uri/ /index.html;\
        add_header Cache-Control "no-cache, no-store, must-revalidate";\
        add_header Pragma "no-cache";\
        add_header Expires "0";\
    }\
\
    location /health {\
        access_log off;\
        return 200 "healthy\\n";\
        add_header Content-Type text/plain;\
    }\
}' > /etc/nginx/conf.d/default.conf

# Copiar arquivos buildados do stage anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Criar usuário não-root para nginx
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx-app -g nginx-app nginx-app

# Ajustar permissões
RUN chown -R nginx-app:nginx-app /usr/share/nginx/html && \
    chown -R nginx-app:nginx-app /var/cache/nginx && \
    chown -R nginx-app:nginx-app /var/log/nginx && \
    chown -R nginx-app:nginx-app /etc/nginx/conf.d

# Mudar configuração do nginx para usar usuário não-root
RUN sed -i.bak 's/user  nginx;/user  nginx-app;/' /etc/nginx/nginx.conf

EXPOSE 80

# Executar como usuário não-root
USER nginx-app

CMD ["nginx", "-g", "daemon off;"]