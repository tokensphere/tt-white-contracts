#!/bin/sh
set -e

apk add -U g++ make python3 git

echo "Installing dependencies..."
yarn

echo "Running tests..."
yarn test

# echo "Testing and generating coverage..."
# # yarn coverage
# yarn test
