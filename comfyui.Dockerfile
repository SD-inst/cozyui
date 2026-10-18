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
RUN git clone --depth 1 --single-branch https://github.com/comfyanonymous/ComfyUI /app
WORKDIR /app
RUN --mount=type=cache,target=/root/.cache python -m pip install -r requirements.txt
COPY docker/custom_nodes.txt docker/install_nodes.sh /app/docker/
RUN --mount=type=cache,target=/root/.cache /app/docker/install_nodes.sh
RUN --mount=type=cache,target=/root/.cache python -m pip install llama-cpp-python llama-cpp-agent mkdocs mkdocs-material mkdocstrings[python]
EXPOSE 8188/tcp
ENTRYPOINT ["python", "main.py"]
CMD ["--listen"]