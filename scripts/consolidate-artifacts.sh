#!/bin/sh

mkdir abi
find artifacts/contracts -type f ! -iname "*.dbg.json" -print0 | xargs -I{} -0 cp -v {} abi/
find artifacts/hardhat-diamond-abi -type f ! -iname "*.dbg.json" -print0 | xargs -I{} -0 cp -v {} abi/
