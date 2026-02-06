#!/bin/bash

# LTCG Hype Video Render Script
# This script provides easy rendering options for different platforms

set -e

echo "🎬 LTCG Hype Video Renderer"
echo "=========================="
echo ""
echo "Select render format:"
echo "1) Full HD (1920x1080) - YouTube/Website"
echo "2) Instagram Reel (1080x1920)"
echo "3) Instagram Square (1080x1080)"
echo "4) Twitter/X (1280x720)"
echo "5) GIF (720x405)"
echo "6) Custom"
echo ""
read -p "Enter choice [1-6]: " choice

case $choice in
  1)
    echo "Rendering Full HD..."
    bunx remotion render HypeVideo out/hype-video.mp4 \
      --codec=h264 \
      --crf=18 \
      --pixel-format=yuv420p \
      --video-bitrate=8M
    ;;
  2)
    echo "Rendering Instagram Reel..."
    bunx remotion render HypeVideo out/hype-video-reel.mp4 \
      --height=1920 \
      --width=1080 \
      --codec=h264 \
      --crf=18
    ;;
  3)
    echo "Rendering Instagram Square..."
    bunx remotion render HypeVideo out/hype-video-square.mp4 \
      --height=1080 \
      --width=1080 \
      --codec=h264 \
      --crf=18
    ;;
  4)
    echo "Rendering Twitter/X..."
    bunx remotion render HypeVideo out/hype-video-twitter.mp4 \
      --height=720 \
      --width=1280 \
      --codec=h264 \
      --crf=20
    ;;
  5)
    echo "Rendering GIF..."
    bunx remotion render HypeVideo out/hype-video.gif \
      --codec=gif \
      --height=405 \
      --width=720
    ;;
  6)
    echo "Using custom Remotion CLI..."
    bunx remotion render HypeVideo out/hype-video-custom.mp4
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✅ Render complete!"
echo "Output saved to: out/"
