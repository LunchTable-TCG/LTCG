"use client";

/**
 * Card Editor Page
 *
 * Create or edit a card definition.
 */

import { PageWrapper } from "@/components/layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { api, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type {
  CardArchetype,
  CardAttribute,
  CardId,
  CardRarity,
  CardType,
  MonsterType,
  SpellType,
  TrapType,
} from "@/lib/convexTypes";
import { Badge, Card, Text, Title } from "@tremor/react";
import { CopyIcon, Loader2Icon, SaveIcon, TrashIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Constants
// =============================================================================

const ARCHETYPES = [
  { value: "infernal_dragons", label: "Infernal Dragons" },
  { value: "abyssal_horrors", label: "Abyssal Horrors" },
  { value: "nature_spirits", label: "Nature Spirits" },
  { value: "storm_elementals", label: "Storm Elementals" },
  { value: "shadow_assassins", label: "Shadow Assassins" },
  { value: "celestial_guardians", label: "Celestial Guardians" },
  { value: "undead_legion", label: "Undead Legion" },
  { value: "divine_knights", label: "Divine Knights" },
  { value: "arcane_mages", label: "Arcane Mages" },
  { value: "mechanical_constructs", label: "Mechanical Constructs" },
  { value: "neutral", label: "Neutral" },
];

const CARD_TYPES = [
  { value: "creature", label: "Creature" },
  { value: "spell", label: "Spell" },
  { value: "trap", label: "Trap" },
  { value: "equipment", label: "Equipment" },
];

const RARITIES = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "epic", label: "Epic" },
  { value: "legendary", label: "Legendary" },
];

const ATTRIBUTES = [
  { value: "fire", label: "Fire" },
  { value: "water", label: "Water" },
  { value: "earth", label: "Earth" },
  { value: "wind", label: "Wind" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "divine", label: "Divine" },
  { value: "neutral", label: "Neutral" },
];

const MONSTER_TYPES = [
  { value: "dragon", label: "Dragon" },
  { value: "spellcaster", label: "Spellcaster" },
  { value: "warrior", label: "Warrior" },
  { value: "beast", label: "Beast" },
  { value: "fiend", label: "Fiend" },
  { value: "zombie", label: "Zombie" },
  { value: "machine", label: "Machine" },
  { value: "aqua", label: "Aqua" },
  { value: "pyro", label: "Pyro" },
  { value: "divine_beast", label: "Divine Beast" },
];

const SPELL_TYPES = [
  { value: "normal", label: "Normal" },
  { value: "quick_play", label: "Quick-Play" },
  { value: "continuous", label: "Continuous" },
  { value: "field", label: "Field" },
  { value: "equip", label: "Equip" },
  { value: "ritual", label: "Ritual" },
];

const TRAP_TYPES = [
  { value: "normal", label: "Normal" },
  { value: "continuous", label: "Continuous" },
  { value: "counter", label: "Counter" },
];

// =============================================================================
// Component
// =============================================================================

export default function CardEditorPage() {
  const params = useParams<{ cardId: string }>();
  const router = useRouter();
  const isNew = params.cardId === "new";
  const cardId = isNew ? null : params.cardId;

  // Form state
  const [name, setName] = useState("");
  const [rarity, setRarity] = useState("common");
  const [archetype, setArchetype] = useState("neutral");
  const [cardType, setCardType] = useState("creature");
  const [attack, setAttack] = useState<number | "">("");
  const [defense, setDefense] = useState<number | "">("");
  const [cost, setCost] = useState(1);
  const [level, setLevel] = useState<number | "">(1);
  const [attribute, setAttribute] = useState("neutral");
  const [monsterType, setMonsterType] = useState("warrior");
  const [spellType, setSpellType] = useState("normal");
  const [trapType, setTrapType] = useState("normal");
  const [flavorText, setFlavorText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [abilityJson, setAbilityJson] = useState("");
  const [isActive, setIsActive] = useState(true);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");

  // Fetch existing card
  const existingCard = useConvexQuery(
    api.admin.cards.getCard,
    cardId ? { cardId: cardId as CardId } : "skip"
  );

  // Mutations
  const createCard = useConvexMutation(api.admin.cards.createCard);
  const updateCard = useConvexMutation(api.admin.cards.updateCard);
  const deleteCard = useConvexMutation(api.admin.cards.deleteCard);
  const duplicateCardMutation = useConvexMutation(api.admin.cards.duplicateCard);

  // Populate form when card loads
  useEffect(() => {
    if (existingCard) {
      setName(existingCard.name);
      setRarity(existingCard.rarity);
      setArchetype(existingCard.archetype);
      setCardType(existingCard.cardType);
      setAttack(existingCard.attack ?? "");
      setDefense(existingCard.defense ?? "");
      setCost(existingCard.cost);
      setLevel(existingCard.level ?? "");
      setAttribute(existingCard.attribute ?? "neutral");
      setMonsterType(existingCard.monsterType ?? "warrior");
      setSpellType(existingCard.spellType ?? "normal");
      setTrapType(existingCard.trapType ?? "normal");
      setFlavorText(existingCard.flavorText ?? "");
      setImageUrl(existingCard.imageUrl ?? "");
      setIsActive(existingCard.isActive);
      if (existingCard.ability) {
        setAbilityJson(JSON.stringify(existingCard.ability, null, 2));
      }
    }
  }, [existingCard]);

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Card name is required");
      return;
    }

    if (cardType === "creature" && (attack === "" || defense === "")) {
      toast.error("Creatures must have attack and defense values");
      return;
    }

    // Parse ability JSON if provided
    let parsedAbility = undefined;
    if (abilityJson.trim()) {
      try {
        parsedAbility = JSON.parse(abilityJson);
      } catch {
        toast.error("Invalid ability JSON format");
        return;
      }
    }

    setIsSaving(true);
    try {
      const cardData = {
        name: name.trim(),
        rarity: rarity as CardRarity,
        archetype: archetype as CardArchetype,
        cardType: cardType as CardType,
        attack: cardType === "creature" ? Number(attack) : undefined,
        defense: cardType === "creature" ? Number(defense) : undefined,
        cost,
        level: cardType === "creature" && level !== "" ? Number(level) : undefined,
        attribute: cardType === "creature" ? (attribute as CardAttribute) : undefined,
        monsterType: cardType === "creature" ? (monsterType as MonsterType) : undefined,
        spellType: cardType === "spell" ? (spellType as SpellType) : undefined,
        trapType: cardType === "trap" ? (trapType as TrapType) : undefined,
        flavorText: flavorText.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        ability: parsedAbility,
        isActive,
      };

      if (isNew) {
        const result = await createCard(cardData);
        toast.success(result.message);
        router.push(`/cards/${result.cardId}`);
      } else {
        await updateCard({ cardId: cardId as CardId, ...cardData });
        toast.success("Card updated successfully");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save card");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCard({ cardId: cardId as CardId, force: false });
      toast.success("Card deleted");
      router.push("/cards");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete card");
    }
    setDeleteDialogOpen(false);
  };

  const handleDuplicate = async () => {
    if (!duplicateName.trim()) {
      toast.error("Please enter a name for the duplicate");
      return;
    }

    try {
      const result = await duplicateCardMutation({
        cardId: cardId as CardId,
        newName: duplicateName.trim(),
      });
      toast.success(result.message);
      router.push(`/cards/${result.cardId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate card");
    }
    setDuplicateDialogOpen(false);
  };

  // Loading state for existing card
  if (!isNew && existingCard === undefined) {
    return (
      <PageWrapper title="Loading..." description="">
        <Card>
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  if (!isNew && existingCard === null) {
    return (
      <PageWrapper title="Card Not Found" description="">
        <Card>
          <div className="py-8 text-center">
            <Text>This card does not exist.</Text>
            <Button className="mt-4" onClick={() => router.push("/cards")}>
              Back to Cards
            </Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={isNew ? "New Card" : `Edit: ${name}`}
      description={isNew ? "Create a new card definition" : "Modify card properties"}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/cards")}>
            Cancel
          </Button>
          {!isNew && (
            <RoleGuard permission="config.edit">
              <Button
                variant="outline"
                onClick={() => {
                  setDuplicateName(`${name} (Copy)`);
                  setDuplicateDialogOpen(true);
                }}
              >
                <CopyIcon className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
            </RoleGuard>
          )}
          <RoleGuard permission="config.edit">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </RoleGuard>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <Title>Basic Information</Title>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Card Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter card name"
                />
              </div>

              <div className="space-y-2">
                <Label>Card Type *</Label>
                <Select value={cardType} onValueChange={setCardType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rarity *</Label>
                <Select value={rarity} onValueChange={setRarity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RARITIES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Archetype *</Label>
                <Select value={archetype} onValueChange={setArchetype}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARCHETYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Mana Cost *</Label>
                <Input
                  id="cost"
                  type="number"
                  min={0}
                  max={15}
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Card is Active</Label>
              </div>
            </div>
          </Card>

          {/* Type-Specific Fields */}
          {cardType === "creature" && (
            <Card>
              <Title>Creature Stats</Title>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="attack">Attack *</Label>
                  <Input
                    id="attack"
                    type="number"
                    min={0}
                    value={attack}
                    onChange={(e) => setAttack(e.target.value ? Number(e.target.value) : "")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defense">Defense *</Label>
                  <Input
                    id="defense"
                    type="number"
                    min={0}
                    value={defense}
                    onChange={(e) => setDefense(e.target.value ? Number(e.target.value) : "")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Input
                    id="level"
                    type="number"
                    min={1}
                    max={12}
                    value={level}
                    onChange={(e) => setLevel(e.target.value ? Number(e.target.value) : "")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Attribute</Label>
                  <Select value={attribute} onValueChange={setAttribute}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTRIBUTES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Monster Type</Label>
                  <Select value={monsterType} onValueChange={setMonsterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONSTER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          {cardType === "spell" && (
            <Card>
              <Title>Spell Properties</Title>
              <div className="mt-4">
                <div className="space-y-2 max-w-xs">
                  <Label>Spell Type</Label>
                  <Select value={spellType} onValueChange={setSpellType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPELL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          {cardType === "trap" && (
            <Card>
              <Title>Trap Properties</Title>
              <div className="mt-4">
                <div className="space-y-2 max-w-xs">
                  <Label>Trap Type</Label>
                  <Select value={trapType} onValueChange={setTrapType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRAP_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          {/* Ability JSON */}
          <Card>
            <Title>Card Ability (JSON)</Title>
            <Text className="text-muted-foreground mb-4">
              Define card effects and abilities in JSON format
            </Text>
            <Textarea
              value={abilityJson}
              onChange={(e) => setAbilityJson(e.target.value)}
              placeholder='{"effects": [{"type": "draw", "count": 1}]}'
              rows={8}
              className="font-mono text-sm"
            />
          </Card>

          {/* Flavor & Image */}
          <Card>
            <Title>Flavor & Appearance</Title>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flavorText">Flavor Text</Label>
                <Textarea
                  id="flavorText"
                  value={flavorText}
                  onChange={(e) => setFlavorText(e.target.value)}
                  placeholder="Enter flavor text or card description..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Card Preview */}
          <Card>
            <Title>Card Preview</Title>
            <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={name || "Card preview"}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <Text className="font-bold text-lg">{name || "Card Name"}</Text>
                  <Badge
                    color={
                      ({
                        common: "gray",
                        uncommon: "emerald",
                        rare: "blue",
                        epic: "violet",
                        legendary: "amber",
                      } as const)[rarity]
                    }
                  >
                    {rarity}
                  </Badge>
                </div>
                <Text className="text-sm text-muted-foreground capitalize">
                  {cardType} • {ARCHETYPES.find((a) => a.value === archetype)?.label}
                </Text>
                {cardType === "creature" && (
                  <div className="flex gap-4 text-sm">
                    <span>ATK: {attack || 0}</span>
                    <span>DEF: {defense || 0}</span>
                    <span>Cost: {cost}</span>
                  </div>
                )}
                {cardType !== "creature" && <Text className="text-sm">Cost: {cost}</Text>}
                {flavorText && (
                  <Text className="text-sm italic text-muted-foreground mt-2">{flavorText}</Text>
                )}
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          {!isNew && (
            <RoleGuard permission="admin.manage">
              <Card>
                <Title className="text-destructive">Danger Zone</Title>
                <Text className="text-muted-foreground mb-4">
                  Irreversible actions for this card
                </Text>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete Card
                </Button>
              </Card>
            </RoleGuard>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{name}"? This action cannot be undone. If
              players own this card, the deletion will fail unless forced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Dialog */}
      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Card</AlertDialogTitle>
            <AlertDialogDescription>
              Create a copy of "{name}" with a new name. The duplicate will start as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="duplicateName">New Card Name</Label>
            <Input
              id="duplicateName"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicate}>Create Duplicate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
