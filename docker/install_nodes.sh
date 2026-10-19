#!/bin/sh
cd "$(dirname "$0")"
. ./git_mirror.sh

CUSTOM_NODES=${CUSTOM_NODES:-/app/custom_nodes}
NODES_CACHE=${NODES_CACHE:-/nodes-cache}
mkdir -p "$CUSTOM_NODES" "$NODES_CACHE"

install_one() {
    node=$1
    name=$(basename "$node" .git)
    mirror="$NODES_CACHE/$name"

    mirror_prepare "$node" "$mirror" ''
    case $? in
        0) ;;
        1) echo "install_nodes: fetch failed, building $name from cached revision" >&2 ;;
        *) echo "install_nodes: cannot fetch $node, skipped" >&2
           return ;;
    esac

    if ! mirror_unpack "$mirror" "$CUSTOM_NODES/$name"; then
        echo "install_nodes: cannot unpack $name, skipped" >&2
        return
    fi

    cd "$CUSTOM_NODES/$name" || return
    if [ -f requirements.txt ]; then
        pip install -r requirements.txt </dev/null
    fi
}

while read node
do
    [ -n "$node" ] || continue
    install_one "$node"
done < custom_nodes.txt
