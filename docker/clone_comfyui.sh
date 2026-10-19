#!/bin/sh
# ComfyUI core itself, mirror-cached like the custom node packs (docker/git_mirror.sh).
cd "$(dirname "$0")"
. ./git_mirror.sh

COMFYUI_REPO=${COMFYUI_REPO:-https://github.com/comfyanonymous/ComfyUI}
COMFYUI_REV=${COMFYUI_REV:-}
COMFYUI_DIR=${COMFYUI_DIR:-/app}
NODES_CACHE=${NODES_CACHE:-/nodes-cache}

# Unlike optional node packs the core must be exactly what was asked for: a stale
# cached mirror is reported, not silently built into the image.
mirror_prepare "$COMFYUI_REPO" "$NODES_CACHE/ComfyUI" "$COMFYUI_REV"
case $? in
    0) ;;
    1) echo "clone_comfyui: cannot refresh $COMFYUI_REPO for rev=${COMFYUI_REV:-tip}; refusing to build from the stale cached mirror" >&2
       exit 1 ;;
    *) echo "clone_comfyui: cannot fetch $COMFYUI_REPO rev=${COMFYUI_REV:-tip} and no cached mirror to fall back on" >&2
       exit 1 ;;
esac

mirror_unpack "$NODES_CACHE/ComfyUI" "$COMFYUI_DIR" || exit 1
echo "clone_comfyui: ComfyUI at $(git -C "$COMFYUI_DIR" log --oneline -1 </dev/null)"
