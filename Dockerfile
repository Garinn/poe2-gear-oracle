FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates build-essential luajit libluajit-5.1-dev && rm -rf /var/lib/apt/lists/*
RUN git init /tmp/luautf8 && git -C /tmp/luautf8 remote add origin https://github.com/starwing/luautf8.git && git -C /tmp/luautf8 fetch --depth 1 origin a47b1433473a2509d77ad28f59a976716d187927 && git -C /tmp/luautf8 checkout FETCH_HEAD && mkdir -p /usr/local/lib/lua/5.1 && gcc -O2 -shared -fPIC -I/usr/include/luajit-2.1 /tmp/luautf8/lutf8lib.c -o /usr/local/lib/lua/5.1/lua-utf8.so
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run setup:pob && npm run build
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["npm","start"]
