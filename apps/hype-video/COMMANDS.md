# Command Reference

Quick command reference for the LTCG Hype Video project.

## 🎬 Essential Commands

### Install
```bash
bun install
```

### Preview (Remotion Studio)
```bash
bun start
# Opens http://localhost:3000
```

### Render Default
```bash
bun run render
# Output: out/hype-video.mp4 (1920x1080)
```

### Interactive Render Menu
```bash
./render.sh
# Choose from 6 preset formats
```

## 🎨 Custom Renders

### High Quality
```bash
bunx remotion render HypeVideo out/video.mp4 --crf=18
```

### Fast Preview
```bash
bunx remotion render HypeVideo out/video.mp4 --crf=28 --scale=0.5
```

### Instagram Reel
```bash
bunx remotion render HypeVideo out/reel.mp4 --height=1920 --width=1080
```

### Square
```bash
bunx remotion render HypeVideo out/square.mp4 --height=1080 --width=1080
```

### GIF
```bash
bunx remotion render HypeVideo out/video.gif --codec=gif --scale=0.5
```

### Specific Frame Range
```bash
bunx remotion render HypeVideo out/clip.mp4 --frames=0-300
```

## 🛠️ Utility Commands

### Upgrade Remotion
```bash
bun run upgrade
```

### Lint/Format
```bash
# Install Biome first if needed
bun add -D @biomejs/biome
bun x biome check --write .
```

### Clean Build
```bash
rm -rf out/ .remotion/ node_modules/
bun install
```

## 📊 Info Commands

### List Compositions
```bash
bunx remotion compositions
```

### Check Version
```bash
bunx remotion --version
```

### Help
```bash
bunx remotion --help
bunx remotion render --help
```

## 🚀 Advanced

### Lambda Render (Cloud)
```bash
bunx remotion lambda render HypeVideo
```

### Still Frame Export
```bash
bunx remotion still HypeVideo out/thumbnail.png --frame=450
```

### Multiple Outputs (Parallel)
```bash
bunx remotion render HypeVideo out/hd.mp4 --height=1080 --width=1920 &
bunx remotion render HypeVideo out/square.mp4 --height=1080 --width=1080 &
wait
```

## 🎯 Quality Settings

### Presets

| Quality | CRF | Use Case |
|---------|-----|----------|
| Maximum | 18 | Distribution, YouTube |
| High | 20 | Social media |
| Medium | 23 | Web preview |
| Low | 28 | Quick tests |

### Bitrate Control
```bash
bunx remotion render HypeVideo out/video.mp4 --video-bitrate=8M
```

## 📁 Output Locations

All renders go to: `out/`

```
out/
├── hype-video.mp4      # Default
├── hype-video-reel.mp4 # Vertical
├── hype-video-square.mp4
└── hype-video.gif
```

## 💡 Pro Tips

**Speed up renders:**
```bash
--concurrency=8  # Use more CPU cores
--scale=0.5      # Half resolution (faster)
```

**Better quality:**
```bash
--crf=18 --pixel-format=yuv420p --video-bitrate=10M
```

**Transparent background:**
```bash
--codec=png --image-format=png
```

## 🔗 Links

- [Remotion Docs](https://remotion.dev/docs)
- [CLI Reference](https://remotion.dev/docs/cli)
- [Render Options](https://remotion.dev/docs/render)
