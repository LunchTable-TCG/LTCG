"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CARD_TYPES,
  COMBAT_SCENARIOS,
  ELEMENTS,
  GAME_CONSTANTS,
  GAME_ZONES,
  GLOSSARY,
  TURN_PHASES,
  searchGlossary,
  type GlossaryTerm,
} from "@/lib/game-rules";
import { cn } from "@/lib/utils";
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FlameIcon,
  DropletIcon,
  MountainIcon,
  WindIcon,
  CircleIcon,
  SearchIcon,
  SwordsIcon,
  ShieldIcon,
  SparklesIcon,
  ZapIcon,
  PlayIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// =============================================================================
// QUICK START SECTION
// =============================================================================

function QuickStartSection() {
  return (
    <section id="quick-start" className="mb-12">
      <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2">
        <PlayIcon className="h-6 w-6" />
        Quick Start
      </h2>

      {/* Goal */}
      <div className="bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 pl-4 py-3 mb-6">
        <h3 className="font-semibold text-lg text-white mb-1">Your Goal</h3>
        <p className="text-slate-300">
          Reduce your opponent's <strong className="text-amber-400">Life Points (LP)</strong> from{" "}
          <strong className="text-amber-400">{GAME_CONSTANTS.STARTING_LIFE_POINTS.toLocaleString()}</strong> to{" "}
          <strong className="text-red-400">0</strong> to win the game.
        </p>
      </div>

      {/* Turn Overview */}
      <div className="mb-6">
        <h3 className="font-semibold text-lg text-white mb-3">Turn Overview</h3>
        <div className="flex flex-wrap gap-2">
          {TURN_PHASES.map((phase, index) => (
            <div key={phase.id} className="flex items-center gap-2">
              <div className="bg-slate-700 px-3 py-2 rounded-lg text-sm">
                <span className="text-amber-400 font-medium">{phase.name}</span>
                <p className="text-slate-400 text-xs">{phase.shortDescription}</p>
              </div>
              {index < TURN_PHASES.length - 1 && (
                <ChevronRightIcon className="h-4 w-4 text-slate-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card Types Overview */}
      <div className="mb-6">
        <h3 className="font-semibold text-lg text-white mb-3">Card Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CARD_TYPES.map((cardType) => (
            <div
              key={cardType.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-3 hover:border-amber-500/50 transition-colors"
            >
              <div className="text-2xl mb-1">{cardType.icon}</div>
              <h4 className="font-medium text-white">{cardType.name}</h4>
              <p className="text-xs text-slate-400">{cardType.shortDescription}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Your First Turn */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h3 className="font-semibold text-lg text-white mb-3">Your First Turn</h3>
        <ol className="space-y-2 text-slate-300">
          <li className="flex items-start gap-2">
            <span className="bg-amber-500 text-slate-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </span>
            <span>
              <strong>Draw</strong> - Automatically draw 1 card from your deck
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-amber-500 text-slate-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </span>
            <span>
              <strong>Summon</strong> - Tap a creature in your hand to summon it
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-amber-500 text-slate-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </span>
            <span>
              <strong>Attack</strong> - Tap your creature, then tap the enemy to attack
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-amber-500 text-slate-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
              4
            </span>
            <span>
              <strong>End</strong> - Press End Turn when you're done
            </span>
          </li>
        </ol>

        <div className="mt-4">
          <Link href="/play/story">
            <Button variant="primary" className="gap-2">
              <PlayIcon className="h-4 w-4" />
              Try the Tutorial
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// EXPANDABLE SECTION COMPONENT
// =============================================================================

interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  id: string;
}

function ExpandableSection({
  title,
  icon,
  defaultOpen = false,
  children,
  id,
}: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Open if URL hash matches
  useEffect(() => {
    if (window.location.hash === `#${id}`) {
      setIsOpen(true);
    }
  }, [id]);

  return (
    <div id={id} className="border border-slate-700 rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-amber-400">{icon}</span>
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronDownIcon className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-slate-400" />
        )}
      </button>
      {isOpen && <div className="p-4 border-t border-slate-700">{children}</div>}
    </div>
  );
}

// =============================================================================
// CORE RULES SECTION
// =============================================================================

function TurnPhasesContent() {
  return (
    <div className="space-y-4">
      {TURN_PHASES.map((phase) => (
        <div key={phase.id} id={phase.id} className="bg-slate-800/30 rounded-lg p-4">
          <h4 className="font-semibold text-amber-400 mb-2">{phase.name}</h4>
          <p className="text-slate-300 mb-3">{phase.fullDescription}</p>

          <div className="mb-3">
            <h5 className="text-sm font-medium text-slate-400 mb-1">Allowed Actions:</h5>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              {phase.allowedActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2">
            <h5 className="text-xs font-medium text-amber-400 mb-1">Tips:</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              {phase.tips.map((tip, i) => (
                <li key={i}>• {tip}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummoningContent() {
  return (
    <div className="space-y-4">
      <div className="bg-slate-800/30 rounded-lg p-4">
        <h4 className="font-semibold text-amber-400 mb-2">Normal Summon</h4>
        <p className="text-slate-300 mb-3">
          Once per turn, you can Normal Summon a creature from your hand. The level of the creature
          determines if you need to tribute:
        </p>
        <div className="grid gap-2">
          <div className="flex items-center gap-3 bg-slate-700/50 rounded p-2">
            <span className="text-amber-400 font-mono">Level 1-4</span>
            <span className="text-slate-300">→ No tribute required</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-700/50 rounded p-2">
            <span className="text-amber-400 font-mono">Level 5-6</span>
            <span className="text-slate-300">→ Tribute 1 creature you control</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-700/50 rounded p-2">
            <span className="text-amber-400 font-mono">Level 7+</span>
            <span className="text-slate-300">→ Tribute 2 creatures you control</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-lg p-4">
        <h4 className="font-semibold text-amber-400 mb-2">Special Summon</h4>
        <p className="text-slate-300 mb-2">
          Special Summons are performed through card effects. Unlike Normal Summons:
        </p>
        <ul className="list-disc list-inside text-slate-300 space-y-1">
          <li>No limit per turn</li>
          <li>Don't count against your Normal Summon</li>
          <li>Usually don't require tributes (card-dependent)</li>
        </ul>
      </div>

      <div className="bg-slate-800/30 rounded-lg p-4">
        <h4 className="font-semibold text-amber-400 mb-2">Flip Summon</h4>
        <p className="text-slate-300">
          If you have a face-down creature in Defense Position, you can Flip Summon it to
          face-up Attack Position during your Main Phase. This triggers any "Flip Effects" the creature has.
        </p>
      </div>
    </div>
  );
}

function CombatContent() {
  return (
    <div className="space-y-4">
      <p className="text-slate-300">
        During your Battle Phase, each creature in Attack Position can attack once.
        The outcome depends on the positions and stats of the creatures involved.
      </p>

      <div className="grid gap-3">
        {COMBAT_SCENARIOS.map((scenario, index) => (
          <div key={index} className="bg-slate-800/30 rounded-lg p-4">
            <h4 className="font-semibold text-amber-400 mb-1">{scenario.name}</h4>
            <p className="text-sm text-slate-400 mb-2">{scenario.description}</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-slate-500">Outcome:</span>{" "}
                <span className="text-slate-300">{scenario.outcome}</span>
              </div>
              <div>
                <span className="text-slate-500">Damage:</span>{" "}
                <span className="text-amber-400 font-mono">{scenario.damageFormula}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpellsTrapContent() {
  return (
    <div className="space-y-4">
      {CARD_TYPES.filter((t) => t.id === "spell" || t.id === "trap").map((cardType) => (
        <div key={cardType.id} className="bg-slate-800/30 rounded-lg p-4">
          <h4 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
            <span className="text-xl">{cardType.icon}</span>
            {cardType.name} Cards
          </h4>
          <p className="text-slate-300 mb-3">{cardType.fullDescription}</p>

          <div className="mb-3">
            <h5 className="text-sm font-medium text-slate-400 mb-2">How to Play:</h5>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              {cardType.howToPlay.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>

          {cardType.subtypes && (
            <div>
              <h5 className="text-sm font-medium text-slate-400 mb-2">Subtypes:</h5>
              <div className="grid gap-2">
                {cardType.subtypes.map((subtype) => (
                  <div key={subtype.name} className="bg-slate-700/50 rounded p-2">
                    <span className="text-amber-400 font-medium">{subtype.name}</span>
                    <span className="text-slate-400 text-sm"> - {subtype.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CardZonesContent() {
  return (
    <div className="space-y-4">
      {/* Field Diagram */}
      <div className="bg-slate-800 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-center text-slate-400 mb-4">Opponent's Field</h4>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={`opp-spell-${i}`}
              className="aspect-[3/4] bg-slate-700/50 border border-slate-600 rounded flex items-center justify-center text-xs text-slate-500"
            >
              S/T
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={`opp-monster-${i}`}
              className="aspect-[3/4] bg-slate-700/50 border border-slate-600 rounded flex items-center justify-center text-xs text-slate-500"
            >
              Monster
            </div>
          ))}
        </div>

        <div className="border-t border-slate-600 my-4" />

        <div className="grid grid-cols-5 gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={`my-monster-${i}`}
              className="aspect-[3/4] bg-amber-500/20 border border-amber-500/50 rounded flex items-center justify-center text-xs text-amber-400"
            >
              Monster
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={`my-spell-${i}`}
              className="aspect-[3/4] bg-amber-500/20 border border-amber-500/50 rounded flex items-center justify-center text-xs text-amber-400"
            >
              S/T
            </div>
          ))}
        </div>
        <h4 className="font-semibold text-center text-amber-400 mt-4">Your Field</h4>
      </div>

      {/* Zone descriptions */}
      <div className="grid gap-3">
        {GAME_ZONES.map((zone) => (
          <div key={zone.id} id={zone.id} className="bg-slate-800/30 rounded-lg p-3">
            <h4 className="font-semibold text-amber-400">{zone.name}</h4>
            <p className="text-sm text-slate-300">{zone.fullDescription}</p>
            {zone.capacity && (
              <span className="text-xs text-slate-500">Capacity: {zone.capacity}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoreRulesSection() {
  return (
    <section id="core-rules" className="mb-12">
      <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2">
        <BookOpenIcon className="h-6 w-6" />
        Core Rules
      </h2>

      <ExpandableSection
        id="turn-phases"
        title="Turn Phases"
        icon={<SparklesIcon className="h-5 w-5" />}
        defaultOpen
      >
        <TurnPhasesContent />
      </ExpandableSection>

      <ExpandableSection
        id="summoning"
        title="Summoning"
        icon={<ZapIcon className="h-5 w-5" />}
      >
        <SummoningContent />
      </ExpandableSection>

      <ExpandableSection
        id="combat"
        title="Combat"
        icon={<SwordsIcon className="h-5 w-5" />}
      >
        <CombatContent />
      </ExpandableSection>

      <ExpandableSection
        id="spells-traps"
        title="Spells & Traps"
        icon={<SparklesIcon className="h-5 w-5" />}
      >
        <SpellsTrapContent />
      </ExpandableSection>

      <ExpandableSection
        id="card-zones"
        title="Card Zones"
        icon={<ShieldIcon className="h-5 w-5" />}
      >
        <CardZonesContent />
      </ExpandableSection>
    </section>
  );
}

// =============================================================================
// ADVANCED RULES SECTION
// =============================================================================

function AdvancedRulesSection() {
  return (
    <section id="advanced-rules" className="mb-12">
      <h2 className="text-2xl font-bold text-slate-400 mb-6 flex items-center gap-2">
        <SwordsIcon className="h-6 w-6" />
        Advanced Rules
      </h2>

      <ExpandableSection
        id="chain-resolution"
        title="Chain Resolution"
        icon={<SparklesIcon className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            When multiple effects activate in response to each other, they form a "chain."
            Chains resolve in <strong className="text-amber-400">reverse order</strong> (last-in, first-out).
          </p>
          <div className="bg-slate-800/30 rounded-lg p-4">
            <h5 className="font-medium text-amber-400 mb-2">Example:</h5>
            <ol className="text-sm text-slate-300 space-y-2">
              <li>1. You activate a Spell (Chain Link 1)</li>
              <li>2. Opponent activates a Trap in response (Chain Link 2)</li>
              <li>3. You activate a Counter Trap (Chain Link 3)</li>
              <li className="text-amber-400">→ Resolution: 3 → 2 → 1</li>
            </ol>
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection
        id="spell-speed"
        title="Spell Speed"
        icon={<ZapIcon className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Spell Speed determines what can respond to what in a chain.
          </p>
          <div className="grid gap-2">
            <div className="bg-slate-800/30 rounded p-3">
              <span className="text-amber-400 font-mono">Speed 1</span>
              <span className="text-slate-400"> - Normal Spells, creature effects</span>
              <p className="text-xs text-slate-500">Cannot be chained to</p>
            </div>
            <div className="bg-slate-800/30 rounded p-3">
              <span className="text-amber-400 font-mono">Speed 2</span>
              <span className="text-slate-400"> - Quick-Play Spells, Trap cards</span>
              <p className="text-xs text-slate-500">Can respond to Speed 1 or 2</p>
            </div>
            <div className="bg-slate-800/30 rounded p-3">
              <span className="text-amber-400 font-mono">Speed 3</span>
              <span className="text-slate-400"> - Counter Traps only</span>
              <p className="text-xs text-slate-500">Can respond to anything</p>
            </div>
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection
        id="damage-calculation"
        title="Damage Calculation"
        icon={<ShieldIcon className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Battle damage is calculated based on the positions of the creatures involved.
          </p>
          <div className="bg-slate-800/30 rounded-lg p-4 font-mono text-sm">
            <p className="text-slate-400 mb-2">ATK vs ATK:</p>
            <p className="text-amber-400">Damage = |Attacker ATK - Defender ATK|</p>
            <p className="text-slate-400 mt-4 mb-2">ATK vs DEF:</p>
            <p className="text-amber-400">Damage = max(0, Defender DEF - Attacker ATK)</p>
            <p className="text-xs text-slate-500 mt-2">
              * Damage goes to the controller of the weaker creature
            </p>
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection
        id="effect-timing"
        title="Effect Timing"
        icon={<SparklesIcon className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="bg-slate-800/30 rounded-lg p-4">
            <h5 className="font-medium text-amber-400 mb-2">Trigger Effects</h5>
            <p className="text-sm text-slate-300">
              Activate automatically when their condition is met (e.g., "When this card is destroyed").
              Multiple triggers of the same timing form a chain.
            </p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-4">
            <h5 className="font-medium text-amber-400 mb-2">Continuous Effects</h5>
            <p className="text-sm text-slate-300">
              Always active while the card is face-up on the field. Don't use the chain.
              Examples: ATK/DEF boosts, restrictions.
            </p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-4">
            <h5 className="font-medium text-amber-400 mb-2">OPT (Once Per Turn)</h5>
            <p className="text-sm text-slate-300">
              Effects marked "once per turn" can only be used once each turn, even if you have
              multiple copies of the card.
            </p>
          </div>
        </div>
      </ExpandableSection>
    </section>
  );
}

// =============================================================================
// ELEMENTS SECTION
// =============================================================================

function ElementsSection() {
  const elementIcons: Record<string, React.ReactNode> = {
    fire: <FlameIcon className="h-5 w-5" />,
    water: <DropletIcon className="h-5 w-5" />,
    earth: <MountainIcon className="h-5 w-5" />,
    wind: <WindIcon className="h-5 w-5" />,
    neutral: <CircleIcon className="h-5 w-5" />,
  };

  return (
    <section id="elements" className="mb-12">
      <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2">
        <SparklesIcon className="h-6 w-6" />
        Elements
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        {ELEMENTS.map((element) => (
          <div
            key={element.id}
            id={element.id}
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
            style={{ borderLeftColor: element.color, borderLeftWidth: 4 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: element.color }}>{elementIcons[element.id]}</span>
              <h3 className="font-semibold text-white">{element.name}</h3>
              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                {element.playstyle}
              </span>
            </div>
            <p className="text-sm text-slate-300 mb-2">{element.description}</p>
            <div className="flex flex-wrap gap-1">
              {element.strengths.map((strength) => (
                <span
                  key={strength}
                  className="text-xs bg-slate-700/50 px-2 py-0.5 rounded text-slate-400"
                >
                  {strength}
                </span>
              ))}
            </div>
            {element.starterDeck && (
              <p className="text-xs text-amber-400 mt-2">
                Starter Deck: {element.starterDeck}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// GLOSSARY SECTION
// =============================================================================

function GlossarySection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTerms, setFilteredTerms] = useState<GlossaryTerm[]>(GLOSSARY);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredTerms(searchGlossary(searchQuery));
    } else {
      setFilteredTerms(GLOSSARY);
    }
  }, [searchQuery]);

  const groupedTerms = filteredTerms.reduce<Record<string, GlossaryTerm[]>>(
    (acc, term) => {
      const category = term.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category]!.push(term);
      return acc;
    },
    {}
  );

  const categoryLabels: Record<string, string> = {
    stats: "Stats",
    actions: "Actions",
    zones: "Zones",
    mechanics: "Mechanics",
    card_types: "Card Types",
  };

  return (
    <section id="glossary" className="mb-12">
      <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2">
        <BookOpenIcon className="h-6 w-6" />
        Glossary
      </h2>

      {/* Search */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search terms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700"
        />
      </div>

      {/* Terms by category */}
      <div className="space-y-6">
        {Object.entries(groupedTerms).map(([category, terms]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-slate-400 mb-3">
              {categoryLabels[category] || category}
            </h3>
            <div className="grid gap-2">
              {terms.map((term) => (
                <div
                  key={term.term}
                  id={term.term.toLowerCase().replace(/\s+/g, "-")}
                  className="bg-slate-800/30 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-amber-400">{term.term}</h4>
                  </div>
                  <p className="text-sm text-slate-300 mt-1">{term.definition}</p>
                  {term.relatedTerms && term.relatedTerms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-slate-500">Related:</span>
                      {term.relatedTerms.map((related) => (
                        <a
                          key={related}
                          href={`#${related.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-xs text-amber-500 hover:text-amber-400"
                        >
                          {related}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <p className="text-center text-slate-400 py-8">
          No terms found matching "{searchQuery}"
        </p>
      )}
    </section>
  );
}

// =============================================================================
// SIDEBAR NAVIGATION
// =============================================================================

function Sidebar() {
  const sections = [
    { id: "quick-start", label: "Quick Start" },
    { id: "core-rules", label: "Core Rules" },
    { id: "turn-phases", label: "Turn Phases", indent: true },
    { id: "summoning", label: "Summoning", indent: true },
    { id: "combat", label: "Combat", indent: true },
    { id: "spells-traps", label: "Spells & Traps", indent: true },
    { id: "card-zones", label: "Card Zones", indent: true },
    { id: "advanced-rules", label: "Advanced Rules" },
    { id: "elements", label: "Elements" },
    { id: "glossary", label: "Glossary" },
  ];

  return (
    <nav className="hidden lg:block sticky top-4 w-48 flex-shrink-0">
      <h3 className="font-semibold text-slate-400 mb-3 text-sm uppercase tracking-wide">
        Contents
      </h3>
      <ul className="space-y-1">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={cn(
                "block py-1 text-sm transition-colors hover:text-amber-400",
                section.indent ? "pl-4 text-slate-500" : "text-slate-300"
              )}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function HowToPlayPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">How to Play</h1>
          <p className="text-slate-400">
            Learn the rules of LunchTable Card Game
          </p>
        </div>

        {/* Main content with sidebar */}
        <div className="flex gap-8">
          <Sidebar />

          <main className="flex-1 min-w-0">
            <QuickStartSection />
            <CoreRulesSection />
            <AdvancedRulesSection />
            <ElementsSection />
            <GlossarySection />

            {/* Footer CTA */}
            <div className="bg-gradient-to-r from-amber-500/20 to-transparent border border-amber-500/30 rounded-lg p-6 text-center">
              <h3 className="text-xl font-bold text-white mb-2">Ready to Play?</h3>
              <p className="text-slate-300 mb-4">
                Put your knowledge to the test with the interactive tutorial.
              </p>
              <Link href="/play/story">
                <Button variant="primary" className="gap-2">
                  <PlayIcon className="h-4 w-4" />
                  Start Tutorial
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
