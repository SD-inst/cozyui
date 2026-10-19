FROM pytorch/pytorch:2.9.1-cuda13.0-cudnn9-devel
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=UTF-8
RUN rm -f /etc/apt/apt.conf.d/docker-clean && echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache
RUN --mount=type=cache,target=/var/cache/apt --mount=type=cache,target=/var/lib/apt apt update && \
    apt install -y \
    git \
    libcairo2-dev \
    ffmpeg \
    libtcmalloc-minimal4 \
    libmimalloc2.0 \
    gifsicle \
    libimage-exiftool-perl \
    sox \
    libportaudio2 \
    portaudio19-dev \
    curl \
    dumb-init

RUN --mount=type=cache,target=/root/.cache python -m pip install --upgrade pip wheel
COPY docker/git_mirror.sh docker/clone_comfyui.sh docker/custom_nodes.txt docker/install_nodes.sh /opt/docker/
# ComfyUI core goes through the same mirror cache as the node packs, so rebuilding
# a later layer costs one fetch instead of a fresh clone. Pin the core with
# `docker compose build --build-arg COMFYUI_REV=<sha>` (empty = remote branch tip).
ARG COMFYUI_REV=
RUN --mount=type=cache,target=/nodes-cache COMFYUI_REV="$COMFYUI_REV" /opt/docker/clone_comfyui.sh
WORKDIR /app
RUN --mount=type=cache,target=/root/.cache python -m pip install -r requirements.txt
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/nodes-cache /opt/docker/install_nodes.sh
EXPOSE 8188/tcp
ENTRYPOINT ["python", "main.py"]
CMD ["--listen"]