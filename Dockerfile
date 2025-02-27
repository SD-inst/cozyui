FROM node:current AS builder
COPY . /app
WORKDIR /app
RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn set version berry && yarn && yarn build

FROM node:current AS runner
COPY --from=builder /app/dist /app
RUN rm -f /etc/apt/apt.conf.d/docker-clean && echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache
RUN --mount=type=cache,target=/var/cache/apt --mount=type=cache,target=/var/lib/apt apt update && apt install -y caddy
WORKDIR /app
ARG API_URL=http://127.0.0.1:8188
EXPOSE 3000/tcp
ENTRYPOINT ["caddy"]
CMD ["file-server", "--listen", "0.0.0.0:3000"]