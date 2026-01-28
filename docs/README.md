# LTCG Documentation

**Lunchtable Trading Card Game** - A Yu-Gi-Oh! inspired multiplayer card game built with Convex and Next.js

---

## 📚 Documentation Index

### Getting Started
- [**MASTER_TODO.md**](../MASTER_TODO.md) - Project completion status and priorities
- [Development Setup](./setup/DEVELOPMENT_SETUP.md) - How to set up the project locally
- [GETTING_STARTED.md](./GETTING_STARTED.md) - 🚧 Setup and development guide (Coming Soon)

### API Reference (NEW!)
- [**Schema Documentation**](./schema.md) - ✅ Complete database schema with 40+ tables and ER diagrams
- [**Core Module API**](./api/core.md) - ✅ Users, Cards, Decks API reference
- [**Error Codes Reference**](./ERROR_CODES.md) - ✅ Complete error code catalog (1xxx-11xxx)
- [Gameplay Module API](./api/gameplay.md) - 🚧 Game engine, lobbies, AI (Coming Soon)
- [Economy Module API](./api/economy.md) - 🚧 Currency, shop, marketplace (Coming Soon)
- [Progression Module API](./api/progression.md) - 🚧 Story mode, quests, XP (Coming Soon)
- [Social Module API](./api/social.md) - 🚧 Friends, chat, leaderboards (Coming Soon)

### Architecture & Patterns
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 🚧 System architecture overview (Coming Soon)
- [PATTERNS.md](./PATTERNS.md) - 🚧 Common development patterns (Coming Soon)
- [Integration Patterns](./reference/INTEGRATION_PATTERNS.md) - Common code patterns
- [Data Flows](./reference/DATA_FLOWS.md) - System architecture and data flow
- [Auth Patterns](./reference/AUTH_PATTERNS.md) - Authentication implementation examples

### Feature Guides
- [Story Mode Guide](./guides/STORY_MODE_GUIDE.md) - Single-player campaign system
- [Effect System Guide](./guides/EFFECT_SYSTEM_GUIDE.md) - Card abilities and triggers
- [Multiplayer Guide](./guides/MULTIPLAYER_GUIDE.md) - Real-time multiplayer gameplay
- [Agent Gameplay Guide](./guides/AGENT_GAMEPLAY_GUIDE.md) - AI and autonomous agent play

### Testing & Deployment
- [Testing Checklist](./testing/TESTING_CHECKLIST.md) - Comprehensive testing guide
- [Story Mode Testing](./testing/STORY_MODE_TESTING.md) - Story mode specific tests
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 🚧 Production deployment guide (Coming Soon)

### Code Examples
- [examples/](./examples/) - 🚧 Code examples directory (Coming Soon)

---

## 🎮 Quick Start

### For Players
1. Navigate to `/play/story` for single-player story mode
2. Navigate to `/lunchtable` for multiplayer lobbies
3. Build decks in `/binder`
4. Check progress in `/profile`

### For Developers
1. Read [MASTER_TODO.md](../MASTER_TODO.md) for current project status
2. Check [Development Setup](./setup/DEVELOPMENT_SETUP.md) for environment configuration
3. Review feature guides for system architecture
4. Run tests using testing checklists

---

## 🏗️ Architecture Overview

```
Frontend (Next.js 15 + React 19)
├─ App Router (/app)
├─ Components (/src/components)
│  ├─ Game (GameBoard, cards, dialogs)
│  ├─ Story (StoryChapterCard, StoryStageNode)
│  └─ Auth (AuthForm, RouteGuard)
└─ Hooks (/src/hooks)

Backend (Convex)
├─ Core (users, cards, decks)
├─ Gameplay (gameEngine, combatSystem, effectSystem, AI)
├─ Economy (shop, marketplace, currency)
├─ Progression (story, achievements, quests)
└─ Social (matchmaking, friends, chat, leaderboards)
```

---

## 📊 Project Status

**Overall Completion: ~85%**

| System | Status |
|--------|--------|
| Authentication | ✅ 100% Complete |
| Multiplayer Core | ✅ 100% Complete |
| Effect System | ⚠️ 85% Complete |
| Story Mode | ⚠️ 70% Complete |
| Documentation | ⚠️ 60% Complete |

See [MASTER_TODO.md](../MASTER_TODO.md) for detailed breakdown.

---

## 🔧 Technology Stack

- **Frontend:** Next.js 15, React 19, TypeScript 5.8+, Tailwind CSS, Shadcn/ui
- **Backend:** Convex (real-time database + serverless functions)
- **Auth:** Convex Auth (built-in session management)
- **Runtime:** Bun 1.3+
- **Deployment:** Vercel

---

## 🤝 Contributing

1. Read [MASTER_TODO.md](../MASTER_TODO.md) to understand current priorities
2. Check the "Critical Incomplete Tasks" section for high-priority work
3. Follow existing code patterns documented in [Integration Patterns](./reference/INTEGRATION_PATTERNS.md)
4. Test using checklists in `/testing`

---

## 📝 License

[Your License Here]

---

**Last Updated:** 2026-01-28
