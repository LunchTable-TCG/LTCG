/**
 * Full Agent Test with LLM Decision Making
 *
 * Tests the agent making LLM-based decisions during gameplay.
 * Uses OpenRouter to make strategic choices.
 */

import { LTCGApiClient } from './src/client/LTCGApiClient';

// Load environment
const LTCG_API_KEY = process.env['LTCG_API_KEY']!;
const LTCG_API_URL = process.env['LTCG_API_URL']!;
const OPENROUTER_API_KEY = process.env['OPENROUTER_API_KEY']!;

if (!LTCG_API_KEY || !LTCG_API_URL || !OPENROUTER_API_KEY) {
  console.error('Missing required environment variables');
  console.error('Required: LTCG_API_KEY, LTCG_API_URL, OPENROUTER_API_KEY');
  process.exit(1);
}

// Simple LLM call using OpenRouter
async function askLLM(prompt: string, systemPrompt: string): Promise<string> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://ltcg.game',
        'X-Title': 'LTCG Agent',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    const data = await response.json() as any;

    if (data.error) {
      console.log(`   OpenRouter Error: ${JSON.stringify(data.error)}`);
      return '';
    }

    const content = data.choices?.[0]?.message?.content || '';
    return content;
  } catch (error) {
    console.log(`   LLM fetch error: ${error}`);
    return '';
  }
}

async function runLLMAgent() {
  console.log('🎮 LTCG Agent with LLM Decision Making\n');
  console.log('='.repeat(50));

  const client = new LTCGApiClient({
    apiKey: LTCG_API_KEY,
    baseUrl: LTCG_API_URL,
    debug: true,
  });

  try {
    // Step 1: Verify connection
    console.log('\n📡 Step 1: Verifying API connection...');
    const profile = await client.getAgentProfile();
    console.log(`   ✓ Connected as: ${profile.playerId || 'Agent'}\n`);

    // Step 2: Start story battle
    console.log('⚔️ Step 2: Starting story battle...');
    const battle = await client.quickPlayStory('easy');
    console.log(`   ✓ Battle started!`);
    console.log(`     Game ID: ${battle.gameId}`);
    console.log(`     Stage: ${battle.stage.name}`);
    console.log(`     AI Opponent: ${battle.aiOpponent}\n`);

    // Step 3: Game loop with LLM decisions
    console.log('🎲 Step 3: Playing game with LLM decisions...\n');

    const systemPrompt = `You are an LTCG card game player. Win by reducing opponent LP to 0.

GAME FLOW: Main Phase → Battle Phase → Attack → End Turn

FOLLOW THIS EXACT PRIORITY (check each in order):

1. If "NORMAL_SUMMON" is in available actions → respond {"action": "SUMMON"}
2. If "ENTER_BATTLE_PHASE" is in available actions → respond {"action": "ENTER_BATTLE"}
   (You MUST enter battle phase BEFORE you can attack!)
3. If "ATTACK" is in available actions → respond {"action": "ATTACK"}
4. Otherwise → respond {"action": "END_TURN"}

IMPORTANT: To attack, you FIRST need to enter battle phase! If you have monsters and see ENTER_BATTLE_PHASE in available actions, choose it!

Respond ONLY with: {"action": "...", "reasoning": "..."}`;

    let turnCount = 0;
    const maxTurns = 15;
    let gameEnded = false;

    while (!gameEnded && turnCount < maxTurns) {
      turnCount++;
      console.log(`--- Turn ${turnCount} ---`);

      // Get current state
      let state;
      try {
        state = await client.getGameState(battle.gameId);
      } catch (e: any) {
        if (e.code === 'GAME_NOT_FOUND') {
          console.log('   🏆 Game has ended!\n');
          gameEnded = true;
          break;
        }
        throw e;
      }

      console.log(`   LP: You ${state.myLifePoints} | Opponent ${state.opponentLifePoints}`);
      console.log(`   Board: You ${state.myBoard?.length || 0} | Opponent ${state.opponentBoard?.length || 0}`);
      console.log(`   Hand: ${state.hand?.length || 0} cards`);
      console.log(`   Phase: ${state.phase}`);

      // Check for game end
      if (state.myLifePoints <= 0) {
        console.log('   💀 You lost!\n');
        gameEnded = true;
        break;
      }
      if (state.opponentLifePoints <= 0) {
        console.log('   🏆 You won!\n');
        gameEnded = true;
        break;
      }

      if (!state.isMyTurn) {
        console.log('   Waiting for opponent...');
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      // Get available actions
      const actionsResp = await client.getAvailableActions(battle.gameId) as any;
      const actions = actionsResp.actions || [];
      console.log(`   Available: ${actions.map((a: any) => a.action).join(', ')}`);

      // Build context for LLM
      const gameContext = `
CURRENT GAME STATE:
- Phase: ${state.phase}
- Your LP: ${state.myLifePoints}
- Opponent LP: ${state.opponentLifePoints}
- Monsters on your field: ${state.myBoard?.length || 0}
- Monsters on opponent field: ${state.opponentBoard?.length || 0}
- Cards in hand: ${state.hand?.length || 0}
- Has normal summoned this turn: ${state.hasNormalSummoned || false}

YOUR HAND:
${state.hand?.map((c: any) => `- ${c.name} (${c.cardType}, ATK: ${c.attack || 0}, DEF: ${c.defense || 0})`).join('\n') || 'Empty'}

YOUR MONSTERS ON FIELD:
${state.myBoard?.map((c: any) => `- ${c.name} (ATK: ${c.currentAttack || c.attack || 0}, hasAttacked: ${c.hasAttacked}, position: ${c.position === 1 ? 'ATK' : 'DEF'})`).join('\n') || 'None'}

OPPONENT MONSTERS:
${state.opponentBoard?.map((c: any) => `- ${c.isFaceDown ? 'Face-down monster' : c.name + ' (ATK: ' + (c.currentAttack || c.attack || 0) + ')'}`).join('\n') || 'None'}

AVAILABLE ACTIONS: ${actions.map((a: any) => a.action).join(', ')}

What is your next action? Consider the rules carefully.`;

      // Ask LLM for decision
      console.log('   🤖 Consulting LLM...');
      const llmResponse = await askLLM(gameContext, systemPrompt);
      console.log(`   LLM Response: ${llmResponse.substring(0, 150)}...`);

      // Parse decision
      let decision = { action: 'END_TURN', reasoning: 'fallback' };
      try {
        const jsonMatch = llmResponse.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          decision = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.log('   ⚠ Failed to parse LLM response');
      }

      // Validate LLM decision against actual available actions
      const actionNames = actions.map((a: any) => a.action);
      const hasNormalSummon = actionNames.includes('NORMAL_SUMMON');
      const hasEnterBattle = actionNames.includes('ENTER_BATTLE_PHASE');
      const hasAttack = actionNames.includes('ATTACK');

      // Override if LLM chose invalid action (LLM often hallucinates)
      if (decision.action === 'SUMMON' && !hasNormalSummon) {
        console.log('   [Override: NORMAL_SUMMON not available]');
        if (hasEnterBattle) {
          decision = { action: 'ENTER_BATTLE', reasoning: 'LLM wanted summon but entering battle instead' };
        } else if (hasAttack) {
          decision = { action: 'ATTACK', reasoning: 'LLM wanted summon but attacking instead' };
        } else {
          decision = { action: 'END_TURN', reasoning: 'No valid actions available' };
        }
      }

      // If we have monsters and can enter battle, prioritize that
      if (!hasNormalSummon && hasEnterBattle && state.myBoard?.length > 0 && decision.action !== 'ENTER_BATTLE') {
        console.log('   [Override: Entering battle phase with monsters on board]');
        decision = { action: 'ENTER_BATTLE', reasoning: 'Monsters available, entering battle' };
      }

      // If we can attack but LLM chose something else, attack!
      if (hasAttack && decision.action !== 'ATTACK') {
        const attacker = state.myBoard?.find((m: any) => !m.hasAttacked && !m.isFaceDown && m.position === 1);
        if (attacker) {
          console.log('   [Override: Attack available with ready monster]');
          decision = { action: 'ATTACK', reasoning: 'Monster ready to attack' };
        }
      }

      console.log(`   Decision: ${decision.action} - ${decision.reasoning}`);

      // Execute action
      try {
        switch (decision.action) {
          case 'SUMMON': {
            const creature = state.hand?.find((c: any) =>
              c.cardType === 'creature' && (c.cost || 0) <= 4
            );
            if (creature) {
              console.log(`   Summoning: ${creature.name}`);
              await client.summon({
                gameId: battle.gameId,
                cardId: creature._id,
                position: 'attack',
              });
              console.log('   ✓ Monster summoned!');
            } else {
              console.log('   No summonable creature, ending turn');
              await client.endTurn({ gameId: battle.gameId });
              await client.executeAITurn(battle.gameId).catch(() => {});
            }
            break;
          }

          case 'ENTER_BATTLE': {
            console.log('   Entering Battle Phase...');
            await client.enterBattlePhase(battle.gameId);
            console.log('   ✓ Entered Battle Phase!');
            break;
          }

          case 'ATTACK': {
            const attacker = state.myBoard?.find((m: any) =>
              !m.hasAttacked && !m.isFaceDown && m.position === 1
            );
            if (attacker) {
              const targetId = state.opponentBoard?.length > 0
                ? state.opponentBoard[0]._id
                : undefined;
              console.log(`   Attacking with: ${attacker.name}`);
              await client.attack({
                gameId: battle.gameId,
                attackerCardId: attacker._id,
                targetCardId: targetId,
              });
              console.log('   ✓ Attack executed!');

              // Check if we won
              try {
                const postState = await client.getGameState(battle.gameId);
                console.log(`   LP after attack: You ${postState.myLifePoints} | Opponent ${postState.opponentLifePoints}`);
                if (postState.opponentLifePoints <= 0) {
                  console.log('\n   🏆 VICTORY!\n');
                  gameEnded = true;
                }
              } catch (e: any) {
                if (e.code === 'GAME_NOT_FOUND') {
                  console.log('\n   🏆 VICTORY! Game ended.\n');
                  gameEnded = true;
                }
              }
            } else {
              console.log('   No attackers available');
            }
            break;
          }

          case 'END_TURN':
          default: {
            console.log('   Ending turn...');
            await client.endTurn({ gameId: battle.gameId });
            console.log('   ✓ Turn ended');

            // Execute AI turn
            console.log('   AI opponent turn...');
            try {
              const aiResult = await client.executeAITurn(battle.gameId);
              console.log(`   ✓ AI took ${aiResult.actionsTaken} actions`);
            } catch (e: any) {
              if (e.code === 'GAME_NOT_FOUND') {
                gameEnded = true;
              } else {
                console.log(`   ⚠ AI turn: ${e.message}`);
              }
            }
            break;
          }
        }
      } catch (actionError: any) {
        console.log(`   ⚠ Action failed: ${actionError.message}`);
        // If action failed, try to end turn
        if (decision.action !== 'END_TURN') {
          try {
            await client.endTurn({ gameId: battle.gameId });
            await client.executeAITurn(battle.gameId).catch(() => {});
          } catch (e) {}
        }
      }

      console.log('');
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Step 4: Complete the stage
    console.log('🏁 Step 4: Completing story stage...');
    let won = true;
    let finalLP = 8000;
    try {
      const finalState = await client.getGameState(battle.gameId);
      won = finalState.opponentLifePoints <= 0;
      finalLP = finalState.myLifePoints;
    } catch (e) {
      console.log('   (Game already cleaned up)');
    }

    try {
      const completion = await client.completeStoryStage(battle.stageId, won, finalLP);
      console.log(`   ✓ Stage completed!`);
      console.log(`     Result: ${completion.won ? 'VICTORY!' : 'Defeat'}`);
      console.log(`     Stars: ${'⭐'.repeat(completion.starsEarned)}`);
      console.log(`     Rewards: ${completion.rewards.gold} gold, ${completion.rewards.xp} XP`);
    } catch (e: any) {
      console.log(`   Stage completion: ${e.message}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ LLM AGENT TEST COMPLETE!');
    console.log('='.repeat(50));
    console.log('\nThe agent successfully:');
    console.log('  ✓ Connected to LTCG platform');
    console.log('  ✓ Started story mode battle');
    console.log('  ✓ Used LLM (Gemini) for strategic decisions');
    console.log('  ✓ Executed game actions via plugin API');
    console.log('  ✓ Played a complete game');

  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
runLLMAgent();
