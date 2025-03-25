FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=UTF-8
RUN rm -f /etc/apt/apt.conf.d/docker-clean && echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache
RUN --mount=type=cache,target=/var/cache/apt --mount=type=cache,target=/var/lib/apt apt update &&\
    apt install -y \
    wget \
    git \
    pkg-config \
    libcairo2-dev \
    python3 \
    python3-pip \
    python-is-python3 \
    ffmpeg \
    libnvrtc11.2 \
    libtcmalloc-minimal4 \
    libmimalloc2.0 \
    gifsicle \
    ninja-build \
    libimage-exiftool-perl

RUN --mount=type=cache,target=/root/.cache python -m pip install --upgrade pip wheel
RUN git clone https://github.com/comfyanonymous/ComfyUI /app
WORKDIR /app
RUN --mount=type=cache,target=/root/.cache python -m pip install --extra-index-url https://download.pytorch.org/whl/cu124 -r requirements.txt
COPY docker/custom_nodes.txt docker/install_nodes.sh /app/docker/
RUN --mount=type=cache,target=/root/.cache /app/docker/install_nodes.sh
RUN --mount=type=cache,target=/root/.cache python -m pip install llama-cpp-python llama-cpp-agent mkdocs mkdocs-material mkdocstrings[python]
EXPOSE 8188/tcp
ENTRYPOINT ["python", "main.py"]
CMD ["--listen"]