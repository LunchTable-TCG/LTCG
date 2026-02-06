# Quick Start Guide

Get your LTCG hype video running in 3 steps:

## Step 1: Install

```bash
cd apps/hype-video
bun install
```

## Step 2: Preview

```bash
bun start
```

Opens at [http://localhost:3000](http://localhost:3000)

## Step 3: Render

### Easy Way (Interactive)
```bash
./render.sh
```

### Quick Way (Default)
```bash
bun run render
```

### Custom Way
```bash
bunx remotion render HypeVideo out/my-video.mp4
```

---

## What You Get

✨ **30-second epic hype video featuring:**

- 🎭 Logo reveal with golden glow
- 🎴 All 10 archetypes animated
- 🎮 Gameplay clips montage
- 📣 Powerful call-to-action

---

## Need Help?

See [README.md](README.md) for full documentation.

**Common Issues:**

- **Assets not loading?** Check paths in src/scenes/
- **Slow preview?** Reduce quality in Studio settings
- **Render failed?** Make sure videos exist in ../../web/public/videos/

---

Made with ❤️ using [Remotion](https://remotion.dev)
