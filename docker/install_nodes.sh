#!/bin/sh
cd "$(dirname "$0")"
(
    while read node
    do
        cd /app/custom_nodes
        git clone --depth 1 --single-branch "$node"
        cd "$(basename "$node" .git)"
        pip install -r requirements.txt
        cd ..
    done
) < custom_nodes.txt