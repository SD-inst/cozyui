#!/bin/sh
cd "$(dirname "$0")/.."
mkdir -p models/clip
mkdir -p models/diffusion_models/hyvid
mkdir -p models/LLM
mkdir -p models/vae/hyvid
mkdir -p models/mmaudio

wget -c 'https://huggingface.co/Comfy-Org/HunyuanVideo_repackaged/resolve/main/split_files/text_encoders/clip_l.safetensors?download=true' -O models/clip/clip_l.safetensors
wget -c 'https://huggingface.co/Comfy-Org/HunyuanVideo_repackaged/resolve/main/split_files/text_encoders/llava_llama3_fp8_scaled.safetensors?download=true' -O models/clip/llava_llama3_fp8_scaled.safetensors
wget -c 'https://huggingface.co/Comfy-Org/HunyuanVideo_repackaged/resolve/main/split_files/vae/hunyuan_video_vae_bf16.safetensors?download=true' -O models/vae/hyvid/hunyuan_video_vae_bf16.safetensors
wget -c 'https://huggingface.co/Kijai/HunyuanVideo_comfy/resolve/main/hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors?download=true' -O models/diffusion_models/hyvid/hunyuan_video_720_fp8_e4m3fn.safetensors
wget -c 'https://huggingface.co/Kijai/HunyuanVideo_comfy/resolve/main/hunyuan_video_FastVideo_720_fp8_e4m3fn.safetensors?download=true' -O models/diffusion_models/hyvid/hunyuan_video_FastVideo_720_fp8_e4m3fn.safetensors
wget -c 'https://huggingface.co/Kijai/MMAudio_safetensors/resolve/main/apple_DFN5B-CLIP-ViT-H-14-384_fp16.safetensors?download=true' -O models/mmaudio/apple_DFN5B-CLIP-ViT-H-14-384_fp16.safetensors
wget -c 'https://huggingface.co/Kijai/MMAudio_safetensors/resolve/main/mmaudio_large_44k_v2_fp16.safetensors?download=true' -O models/mmaudio/mmaudio_large_44k_v2_fp16.safetensors
wget -c 'https://huggingface.co/Kijai/MMAudio_safetensors/resolve/main/mmaudio_synchformer_fp16.safetensors?download=true' -O models/mmaudio/mmaudio_synchformer_fp16.safetensors
wget -c 'https://huggingface.co/Kijai/MMAudio_safetensors/resolve/main/mmaudio_vae_44k_fp16.safetensors?download=true' -O models/mmaudio/mmaudio_vae_44k_fp16.safetensors