# Builder stage.
FROM node:16.20.2-alpine3.18

WORKDIR /app

RUN apk update
RUN apk add --no-cache build-base git python3 bash

RUN git clone --depth 1 --branch v3.0.0-beta.10 \
  https://github.com/opengsn/gsn.git \
  /app

# Build the deps, compile the contracts etc.
RUN yarn create-all-deps && \
    yarn && \
    yarn preprocess

# Build the relay server.
RUN cd packages/relay && \
    yarn
