# LunchTable-TCG MCP Server Prompts

This document describes the custom prompts (slash commands) available in the LunchTable-TCG MCP server.

## Available Prompts

### `/play-casual`
**Description**: Quick start a casual game and guide through the first turn

**Arguments**: None

**What it does**:
- Creates a casual game lobby
- Waits for an opponent to join
- Gets legal moves when the game starts
- Explains the game state and suggests the best first move
- Helps execute the suggested move

**Example usage**:
```
/play-casual
```

---

### `/play-ranked`
**Description**: Quick start a ranked game and help play competitively

**Arguments**: None

**What it does**:
- Creates a ranked game lobby
- Monitors the lobby until an opponent joins
- Continuously analyzes the game state
- Provides strategic advice on each turn with detailed reasoning
- Helps execute optimal moves to win the ranked match

**Example usage**:
```
/play-ranked
```

---

### `/analyze-game`
**Description**: Analyze the current game state and suggest optimal moves

**Arguments**:
- `gameId` (required): The game ID to analyze

**What it does**:
- Gets the current game state and legal moves
- Analyzes life points, cards, and board positions
- Evaluates all legal moves by strategic value
- Recommends the best move with detailed reasoning
- Suggests move sequences for the turn

**Example usage**:
```
/analyze-game gameId=abc123
```

---

### `/build-deck`
**Description**: Interactive deck building assistance for a specific archetype

**Arguments**:
- `archetype` (required): Deck archetype - fire, water, earth, wind, light, dark, or neutral

**What it does**:
- Explains the archetype's strategy and win condition
- Recommends essential core cards
- Suggests optimal deck ratios (monsters/spells/traps)
- Explains important card synergies and combos
- Provides a complete sample decklist with explanations

**Example usage**:
```
/build-deck archetype=fire
/build-deck archetype=water
/build-deck archetype=earth
```

---

### `/spectate`
**Description**: Watch a game and provide live commentary on the state

**Arguments**:
- `lobbyId` (required): The lobby ID to spectate

**What it does**:
- Gets the current game state from the lobby
- Provides engaging commentary on the match
- Analyzes both players' board states
- Explains strategic considerations and likely next moves
- Offers insights to help understand the strategy

**Example usage**:
```
/spectate lobbyId=xyz789
```

---

## How Prompts Work

MCP prompts are pre-configured workflows that expand into detailed instructions for Claude. When you invoke a prompt:

1. The MCP server receives the prompt request with any arguments
2. The server returns a detailed message that instructs Claude on what to do
3. Claude then executes the workflow using the available MCP tools

This makes it easy to perform common tasks without having to explain the entire workflow each time.

## Implementation Details

The prompts are implemented in `/packages/mcp-server/src/index.ts` using:
- `ListPromptsRequestSchema` handler - Returns the list of available prompts
- `GetPromptRequestSchema` handler - Returns the detailed instructions for a specific prompt
- Server capabilities include `prompts: {}` to advertise prompt support

Each prompt returns a message in the format:
```typescript
{
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "Detailed instructions for Claude..."
      }
    }
  ]
}
```
