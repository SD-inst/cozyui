# Mirror-cache helpers, sourced by clone_comfyui.sh and install_nodes.sh.
#
# Each repository is mirrored once in $NODES_CACHE (a BuildKit cache mount), then
# unpacked into the image with a shallow local clone. A layer-cache miss therefore
# costs one `git fetch` per repository instead of a full re-clone.
#
# mirror_prepare exit codes:
#   0  mirror is ready and points at the requested revision / branch tip
#   1  mirror could not be refreshed but a usable mirror is still there
#   2  no usable mirror (fresh fetch failed as well)

# prune_git_locks <mirror-dir>
# A cancelled build leaves the lock files of the git process that was running at
# that moment; on a cache mount they survive into the next build and make every
# later git call fail ("shallow.lock: File exists").
prune_git_locks() {
    [ -d "$1/.git" ] || return 0
    find "$1/.git" -name '*.lock' -type f -print -delete 2>/dev/null | while read -r locked; do
        echo "git_mirror: removed stale lock $locked" >&2
    done
}

# mirror_clone <url> <dest> [rev] — build a fresh single-commit mirror.
# Clones into a scratch dir and swaps it in, so a failed re-clone keeps the
# previous mirror usable.
mirror_clone() {
    url=$1
    dest=$2
    rev=$3
    tmp="$dest.tmp"

    rm -rf "$tmp"
    if [ -n "$rev" ]; then
        # A pinned revision may be older than the branch tip: build the mirror
        # around that exact commit instead of cloning the tip.
        git init -q "$tmp" || { rm -rf "$tmp"; return 1; }
        git -C "$tmp" remote add origin "$url" || { rm -rf "$tmp"; return 1; }
        git -C "$tmp" fetch --depth 1 origin "$rev" </dev/null || { rm -rf "$tmp"; return 1; }
        git -C "$tmp" -c advice.detachedHead=false checkout -q --detach FETCH_HEAD </dev/null || {
            rm -rf "$tmp"
            return 1
        }
    elif ! git clone --depth 1 --single-branch "$url" "$tmp" </dev/null; then
        rm -rf "$tmp"
        return 1
    fi

    rm -rf "$dest"
    mv "$tmp" "$dest"
}

# mirror_update <url> <dest> — move an existing mirror to the remote branch tip.
mirror_update() {
    url=$1
    dest=$2
    prune_git_locks "$dest"

    # Detached mirrors (pinned earlier, or unpacked from a detached mirror) report
    # HEAD, which git also accepts as "the remote's default branch".
    branch=$(git -C "$dest" rev-parse --abbrev-ref HEAD </dev/null 2>/dev/null) || branch=HEAD
    [ -n "$branch" ] || branch=HEAD
    git -C "$dest" fetch --depth 1 origin "$branch" </dev/null || return 1
    git -C "$dest" reset --hard FETCH_HEAD </dev/null
}

# mirror_prepare <url> <mirror-dir> [rev]
mirror_prepare() {
    url=$1
    dest=$2
    rev=$3
    prune_git_locks "$dest"

    if [ ! -d "$dest/.git" ]; then
        mirror_clone "$url" "$dest" "$rev" && return 0
        return 2
    fi

    if [ -n "$rev" ]; then
        if git -C "$dest" fetch --depth 1 origin "$rev" </dev/null &&
            git -C "$dest" -c advice.detachedHead=false checkout -q --detach FETCH_HEAD </dev/null; then
            return 0
        fi
    elif mirror_update "$url" "$dest"; then
        return 0
    fi

    # Refresh failed: either the revision is unreachable from this mirror (it was
    # built around another commit) or the mirror state is broken. Rebuild it.
    echo "git_mirror: cannot update $dest, re-fetching from $url" >&2
    mirror_clone "$url" "$dest" "$rev" && return 0
    if [ -d "$dest/.git" ] && git -C "$dest" rev-parse --verify HEAD </dev/null 2>/dev/null; then
        return 1
    fi
    return 2
}

# mirror_unpack <mirror-dir> <target-dir>
mirror_unpack() {
    mirror=$1
    target=$2
    rm -rf "$target"
    # file:// (not a plain path) keeps this a real shallow copy: a hardlink-local
    # clone would share objects with the cache mount, which is not part of the image.
    git clone --depth 1 --single-branch -c advice.detachedHead=false "file://$mirror" "$target" </dev/null
}
