# ElizaOS Official Reference (Context7 + DeepWiki Aids)

## Purpose

Use this file when you need canonical ElizaOS patterns while working in LTCG.
Repository code remains the final source of truth for local behavior.

## Sources Used

- Context7 library: `/elizaos/docs`
- Official docs pages surfaced by Context7:
  - `cli-reference/start.mdx`
  - `cli-reference/agent.mdx`
  - `plugins/development.mdx`
  - `plugins/components.mdx`
  - `plugins/architecture.mdx`
  - `agents/character-interface.mdx`
- DeepWiki orientation pages:
  - https://deepwiki.com/elizaOS/eliza
  - https://deepwiki.com/elizaOS/eliza/6-development-guide
  - https://deepwiki.com/elizaOS/eliza/10-integration-and-deployment
  - https://deepwiki.com/elizaOS/eliza/3.2-character-system

Use DeepWiki for navigation, not final authority.

## CLI Patterns

Core lifecycle commands (from official docs):

```bash
# Create
elizaos create -type agent eliza
elizaos create -type project my-project

# Start runtime
elizaos start

# Agent operations
elizaos agent list
elizaos agent start --path ./eliza.json
elizaos agent get --name eliza
elizaos agent set --name eliza --config '{"system":"Updated prompt"}'
elizaos agent stop --name eliza
elizaos agent clear-memories --name eliza
elizaos agent remove --name eliza
```

Start options (from official docs):

```bash
elizaos start --port 8080
elizaos start --configure
elizaos start --character ./character.json
elizaos start --character ./char1.json ./char2.json
elizaos start --character "char1.json,char2.json"
```

Env loading patterns:

```bash
elizaos start                     # loads .env in current project
OPENAI_API_KEY=... elizaos start # inline env
```

## Character Structure

Official fields used in typical character definitions:

- `name`, `username`
- `system`
- `bio`, `topics`, `adjectives`
- `messageExamples`, `postExamples`
- `style` (`all`, `chat`, `post`)
- `knowledge`
- `plugins`
- `settings` (including `settings.secrets`)

Minimal JSON shape from official docs:

```json
{
  "name": "eliza",
  "system": "You are a friendly and knowledgeable AI assistant named Eliza.",
  "bio": ["Helpful and engaging conversationalist"],
  "plugins": ["@elizaos/plugin-openai"],
  "settings": { "secrets": { "OPENAI_API_KEY": "sk-..." } },
  "knowledge": ["./knowledge/general-info.md"]
}
```

## Plugin Interface

Canonical plugin shape (official):

```ts
import type { Plugin } from "@elizaos/core";

export const myPlugin: Plugin = {
  name: "plugin-name",
  description: "Plugin description",
  actions: [],
  providers: [],
  evaluators: [],
  services: [],
  routes: [],
  events: {},
  init: async (config, runtime) => {
    const value = runtime.getSetting("MY_SETTING");
  },
};
```

Key plugin component buckets:

- `actions`
- `providers`
- `evaluators`
- `services`
- optional `routes`, `events`, `models`, `tests`, `dependencies`

## Runtime Settings Guidance

Recommended pattern:

- Read secrets/settings via `runtime.getSetting("KEY")`.
- Validate required settings in `init` or service startup.
- Fail early with explicit error messages for missing critical settings.

## Practical Policy For This Monorepo

When official docs and local implementation differ:

1. Keep local behavior stable unless migration is explicitly requested.
2. Prefer additive compatibility changes.
3. Document divergences in agent docs (`apps/docs-agents`) when user-visible.
