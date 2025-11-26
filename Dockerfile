
# --- Build (PNPM) ---
FROM node:20-alpine AS build
WORKDIR /app

# Habilita Corepack e usa PNPM
RUN corepack enable

# Instala dependências com cache básico
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copia arquivos de configuração importantes
COPY vite.config.js postcss.config.cjs tailwind.config.js ./

# Define variável de ambiente para produção
ENV VITE_BACKEND_URL=https://api.bloginfinitoautomatico.com
ENV VITE_API_URL=https://api.bloginfinitoautomatico.com
ENV NODE_ENV=production
ENV VITE_ENABLE_PROD_LOGS=false

# Copia apenas .env.production para evitar conflitos
COPY .env.production .env

# Copia o restante do projeto e faz o build
COPY . .
RUN pnpm run build

# --- Serve (Nginx) ---
FROM nginx:1.27-alpine

# Copia os arquivos estáticos gerados pelo Vite/React
COPY --from=build /app/dist /usr/share/nginx/html

# Copia arquivos de configuração do Vite/React para debug (opcional)
COPY --from=build /app/vite.config.js /usr/share/nginx/html/
COPY --from=build /app/.env /usr/share/nginx/html/

# Config SPA + cache de /assets
RUN rm /etc/nginx/conf.d/default.conf && \
    printf 'server {\n  listen 80;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n  location /assets/ {\n    expires 1y;\n    add_header Cache-Control "public";\n  }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]