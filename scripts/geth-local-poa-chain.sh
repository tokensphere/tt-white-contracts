#!/bin/bash -e
trap cleanup EXIT
DATADIR="./geth-local-poa-chain"

function cleanup {
  # Delete any previous data dir.
  echo "Cleaning up..."
  rm -rf "$DATADIR/geth/"
}

# Clean up, in case something wasn't deleted from last run.
cleanup

# Initialize data dir from Genesis.
geth init \
  --datadir "$DATADIR" \
  "${DATADIR}/genesis.json"

# Run geth in dev mode (poa, sealing enabled).
geth --dev \
  --datadir "$DATADIR" \
  --miner.etherbase "0x53df057d9468b50702f5705a420031a059d71a87" \
  --http \
  --http.addr "0.0.0.0" \
  --http.port 8546 \
  --http.api "eth,web3,net" \
  --http.corsdomain "*" \
  --ipcdisable
