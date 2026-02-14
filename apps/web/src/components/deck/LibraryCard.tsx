import { cn } from "@/lib/utils";
import { Image } from "@/components/ui/image";

export interface LibraryCardProps {
  card: {
    _id: string;
    name: string;
    rarity: string;
    archetype?: string;
    cardType: string;
    cost: number;
    attack?: number;
    defense?: number;
    level?: number;
    imageUrl?: string;
    abilityText?: string; // or inferred from ability JSON
    flavorText?: string;
  };
  onClick?: () => void;
  count?: number; // For deck builder (how many copies in deck)
  quantity?: number; // For inventory (how many owned)
  size?: "sm" | "md" | "lg";
}

export function LibraryCard({ card, onClick, count, quantity, size = "md" }: LibraryCardProps) {
  const isCreature = card.cardType === "stereotype" || card.cardType === "creature";

  // Zine Styles
  const borderStyle = "border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all cursor-pointer";

  const sizeClasses = {
    sm: "w-32 h-44 text-[10px]",
    md: "w-48 h-64 text-xs",
    lg: "w-64 h-96 text-sm",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col p-2 select-none",
        borderStyle,
        sizeClasses[size]
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-1 border-b border-black pb-1">
        <h3 className="font-bold uppercase tracking-tighter leading-none">{card.name}</h3>
        <div className="font-mono bg-black text-white px-1 rounded-sm">{card.cost}</div>
      </div>

      {/* Image Placeholder or Real Image */}
      <div className="relative flex-1 bg-gray-100 border border-black mb-1 overflow-hidden grayscale contrast-125">
        {card.imageUrl ? (
          <Image src={card.imageUrl} alt={card.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-[url('/brand/textures/photocopy-noise.png')]">
             <span className="opacity-20 text-4xl font-black">?</span>
          </div>
        )}
      </div>

      {/* Stats / Type */}
      <div className="flex justify-between items-center text-[10px] font-bold uppercase mb-1">
        <span>{card.archetype || "Neutral"}</span>
        <span>{card.cardType}</span>
      </div>

      {/* Attributes (if creature) */}
      {isCreature && (
         <div className="flex justify-between border-t border-black pt-1 mt-auto">
            <div className="flex items-center gap-1">
                <span className="font-black">ATK</span> {card.attack}
            </div>
            <div className="flex items-center gap-1">
                <span className="font-black">DEF</span> {card.defense}
            </div>
         </div>
      )}

      {/* Quantity Badges */}
      {(quantity !== undefined) && (
        <div className="absolute top-[-8px] left-[-8px] bg-yellow-400 border border-black px-1.5 py-0.5 text-xs font-bold rounded-full shadow-sm z-10">
          x{quantity}
        </div>
      )}

      {(count !== undefined && count > 0) && (
        <div className="absolute top-[-8px] right-[-8px] bg-green-500 text-white border border-black px-1.5 py-0.5 text-xs font-bold rounded-full shadow-sm z-10">
          In Deck: {count}
        </div>
      )}

    </div>
  );
}
