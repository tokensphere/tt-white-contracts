#!/bin/sh

find artifacts/contracts -type f ! -iname "*.dbg.json" -print0 | xargs -I{} -0 cp -v {} abi/
