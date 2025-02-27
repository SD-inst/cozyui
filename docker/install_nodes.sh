#!/bin/sh
cd "$(dirname "$0")"
(
    while read node
    do
        cd /app/custom_nodes
        git clone $node
        cd "$(basename "$node")"
        pip install -r requirements.txt
        cd ..
    done
) < custom_nodes.txt