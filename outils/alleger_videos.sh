#!/usr/bin/env bash
# Les copies ALLEGEES des videos pour le site (jamais les originaux ni les rushes) : 540 x 960, 30 images, sans son,
# quelques centaines de Ko a 2 Mo chacune, lisibles des le debut (faststart), et leur affiche (une image a 1 seconde).
# Usage : bash outils/alleger_videos.sh <ffmpeg.exe> <dossier des videos d'origine> 08 03 04 ...
set -u
FF="$1"; SRC="$2"; shift 2
ICI="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ICI/assets/videos" "$ICI/assets/affiches"
for n in "$@"; do
  e="$SRC/video_$n/video_$n.mp4"
  [ -f "$e" ] || { echo "ABSENTE : $e"; continue; }
  "$FF" -nostdin -loglevel error -y -threads 2 -i "$e" -an -vf "scale=540:960:flags=lanczos,fps=30" -c:v libx264 -preset medium -crf 29 \
    -pix_fmt yuv420p -profile:v main -movflags +faststart "$ICI/assets/videos/casteria_$n.mp4" || { echo "ECHEC $n"; continue; }
  "$FF" -nostdin -loglevel error -y -ss 1 -i "$e" -frames:v 1 -vf "scale=540:960:flags=lanczos" -q:v 5 "$ICI/assets/affiches/casteria_$n.jpg"
  echo "$n : $(ls -la "$ICI/assets/videos/casteria_$n.mp4" | awk '{print int($5/1024)}') Ko"
done
