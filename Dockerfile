FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates build-essential && rm -rf /var/lib/apt/lists/*
RUN git init /tmp/luajit && git -C /tmp/luajit remote add origin https://github.com/LuaJIT/LuaJIT.git && git -C /tmp/luajit fetch --depth 1 origin c6ffc141a8762b41703f9287d63d93622a13dd8f && git -C /tmp/luajit checkout FETCH_HEAD && make -C /tmp/luajit -j2 && make -C /tmp/luajit install
RUN git init /tmp/luautf8 && git -C /tmp/luautf8 remote add origin https://github.com/starwing/luautf8.git && git -C /tmp/luautf8 fetch --depth 1 origin a47b1433473a2509d77ad28f59a976716d187927 && git -C /tmp/luautf8 checkout FETCH_HEAD && mkdir -p /usr/local/lib/lua/5.1 && gcc -O2 -shared -fPIC -I/usr/local/include/luajit-2.1 /tmp/luautf8/lutf8lib.c -o /usr/local/lib/lua/5.1/lua-utf8.so
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run setup:pob && npm run build && npm test && npm run test:pob
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["npm","start"]
