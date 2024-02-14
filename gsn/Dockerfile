# Building from the CI image (Circle CI)
FROM cimg/node:16.20.1

WORKDIR /app

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
