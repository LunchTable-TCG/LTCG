import type { Id } from "@convex/_generated/dataModel";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CardInfo,
  OptionalTriggerPrompt,
  type PendingOptionalTrigger,
} from "@/components/game/dialogs/OptionalTriggerPrompt";

// Create mock function at module scope
const mockRespondToTrigger = vi.fn();

// Mock convex helpers
vi.mock("@/lib/convexHelpers", () => ({
  typedApi: {
    gameplay: {
      triggerSystem: {
        respondToOptionalTrigger: "respondToOptionalTrigger",
      },
    },
  },
  apiAny: {
    gameplay: {
      triggerSystem: {
        respondToOptionalTrigger: "respondToOptionalTrigger",
      },
    },
  },
  useConvexMutation: () => mockRespondToTrigger,
}));

// Mock next/image to avoid image loading issues in tests
vi.mock("next/image", () => ({
  default: function MockImage({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) {
    return <img src={src} alt={alt} className={className} />;
  },
}));

// Mock framer-motion to avoid animation complexity in tests
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      className,
      onClick,
      ...props
    }: {
      children?: React.ReactNode;
      className?: string;
      onClick?: () => void;
    }) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
}));

describe("OptionalTriggerPrompt", () => {
  const mockOnClose = vi.fn();

  // Create properly typed IDs
  const mockPlayerId = "player123" as Id<"users">;
  const mockOtherPlayerId = "player456" as Id<"users">;
  const mockLobbyId = "lobby123" as Id<"gameLobbies">;
  const mockCardId = "card123" as Id<"cardDefinitions">;
  const mockCardId2 = "card456" as Id<"cardDefinitions">;

  const mockPendingTrigger: PendingOptionalTrigger = {
    cardId: mockCardId,
    cardName: "Dragon Knight",
    effectIndex: 0,
    trigger: "on_summon",
    playerId: mockPlayerId,
    addedAt: Date.now(),
  };

  const mockCardInfo: CardInfo = {
    _id: mockCardId,
    name: "Dragon Knight",
    imageUrl: "/cards/dragon-knight.png",
    cardType: "Monster",
    rarity: "rare",
    effects: [
      {
        name: "Battle Fury",
        description: "When summoned, destroy one enemy monster.",
        trigger: "on_summon",
        isOptional: true,
        spellSpeed: 1,
      },
    ],
  };

  const defaultProps = {
    pendingTriggers: [mockPendingTrigger],
    lobbyId: mockLobbyId,
    currentPlayerId: mockPlayerId,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRespondToTrigger.mockResolvedValue(undefined);
  });

  it("should render the modal with card name and trigger", () => {
    render(<OptionalTriggerPrompt {...defaultProps} />);

    expect(screen.getByText("Optional Effect Trigger")).toBeInTheDocument();
    // Card name appears in both image fallback and card details - use getAllByText
    const cardNames = screen.getAllByText("Dragon Knight");
    expect(cardNames.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("When Summoned")).toBeInTheDocument();
  });

  it("should render Activate and Skip buttons", () => {
    render(<OptionalTriggerPrompt {...defaultProps} />);

    expect(screen.getByRole("button", { name: /activate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("should render effect description when getCardInfo is provided", () => {
    const getCardInfo = vi.fn().mockReturnValue(mockCardInfo);

    render(<OptionalTriggerPrompt {...defaultProps} getCardInfo={getCardInfo} />);

    expect(screen.getByText("Battle Fury")).toBeInTheDocument();
    expect(screen.getByText("When summoned, destroy one enemy monster.")).toBeInTheDocument();
  });

  it("should show default description when getCardInfo returns no effect", () => {
    render(<OptionalTriggerPrompt {...defaultProps} />);

    expect(
      screen.getByText("This card has an optional effect that can be activated.")
    ).toBeInTheDocument();
  });

  it("should render card image when available", () => {
    const getCardInfo = vi.fn().mockReturnValue(mockCardInfo);

    render(<OptionalTriggerPrompt {...defaultProps} getCardInfo={getCardInfo} />);

    const image = screen.getByRole("img", { name: /dragon knight/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/cards/dragon-knight.png");
  });

  it("should render fallback when no card image", () => {
    const cardInfoWithoutImage: CardInfo = {
      ...mockCardInfo,
      imageUrl: undefined,
    };
    const getCardInfo = vi.fn().mockReturnValue(cardInfoWithoutImage);

    render(<OptionalTriggerPrompt {...defaultProps} getCardInfo={getCardInfo} />);

    // Should show fallback with card name
    const fallbackTexts = screen.getAllByText("Dragon Knight");
    expect(fallbackTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("should call respondToTrigger with activate=true when Activate is clicked", async () => {
    const user = userEvent.setup();
    render(<OptionalTriggerPrompt {...defaultProps} />);

    const activateButton = screen.getByRole("button", { name: /activate/i });
    await user.click(activateButton);

    await waitFor(() => {
      expect(mockRespondToTrigger).toHaveBeenCalledWith({
        lobbyId: mockLobbyId,
        cardId: mockCardId,
        effectIndex: 0,
        activate: true,
      });
    });
  });

  it("should call respondToTrigger with activate=false when Skip is clicked", async () => {
    const user = userEvent.setup();
    render(<OptionalTriggerPrompt {...defaultProps} />);

    const skipButton = screen.getByRole("button", { name: /skip/i });
    await user.click(skipButton);

    await waitFor(() => {
      expect(mockRespondToTrigger).toHaveBeenCalledWith({
        lobbyId: mockLobbyId,
        cardId: mockCardId,
        effectIndex: 0,
        activate: false,
      });
    });
  });

  it("should call onClose after responding to single trigger", async () => {
    const user = userEvent.setup();
    render(<OptionalTriggerPrompt {...defaultProps} />);

    const activateButton = screen.getByRole("button", { name: /activate/i });
    await user.click(activateButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it("should not render when no triggers for current player", () => {
    const otherPlayerTrigger: PendingOptionalTrigger = {
      ...mockPendingTrigger,
      playerId: mockOtherPlayerId,
    };

    const { container } = render(
      <OptionalTriggerPrompt {...defaultProps} pendingTriggers={[otherPlayerTrigger]} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should not render when pendingTriggers is empty", () => {
    const { container } = render(<OptionalTriggerPrompt {...defaultProps} pendingTriggers={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("should show progress indicator when multiple triggers exist", () => {
    const multipleTriggers: PendingOptionalTrigger[] = [
      mockPendingTrigger,
      {
        cardId: mockCardId2,
        cardName: "Fire Elemental",
        effectIndex: 0,
        trigger: "on_destroy",
        playerId: mockPlayerId,
        addedAt: Date.now(),
      },
    ];

    render(<OptionalTriggerPrompt {...defaultProps} pendingTriggers={multipleTriggers} />);

    expect(screen.getByText("1 of 2 triggers")).toBeInTheDocument();
  });

  it("should advance to next trigger after responding", async () => {
    const user = userEvent.setup();
    const multipleTriggers: PendingOptionalTrigger[] = [
      mockPendingTrigger,
      {
        cardId: mockCardId2,
        cardName: "Fire Elemental",
        effectIndex: 0,
        trigger: "on_destroy",
        playerId: mockPlayerId,
        addedAt: Date.now(),
      },
    ];

    render(<OptionalTriggerPrompt {...defaultProps} pendingTriggers={multipleTriggers} />);

    // First trigger should be shown - use getAllByText since name appears in multiple places
    const dragonKnightElements = screen.getAllByText("Dragon Knight");
    expect(dragonKnightElements.length).toBeGreaterThanOrEqual(1);

    const skipButton = screen.getByRole("button", { name: /skip/i });
    await user.click(skipButton);

    // After clicking, should show second trigger
    await waitFor(() => {
      const fireElementalElements = screen.getAllByText("Fire Elemental");
      expect(fireElementalElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("2 of 2 triggers")).toBeInTheDocument();
    });
  });

  it("should disable buttons while submitting", async () => {
    // Make the mutation take some time
    mockRespondToTrigger.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const user = userEvent.setup();
    render(<OptionalTriggerPrompt {...defaultProps} />);

    const activateButton = screen.getByRole("button", { name: /activate/i });
    await user.click(activateButton);

    // Buttons should be disabled while submitting
    expect(activateButton).toBeDisabled();
    expect(screen.getByRole("button", { name: /skip/i })).toBeDisabled();
  });

  it("should show close button in header", () => {
    render(<OptionalTriggerPrompt {...defaultProps} />);

    // The close button should be present - there should be at least one button with an X icon
    const allButtons = screen.getAllByRole("button");
    // We have Activate, Skip, and Close (X) buttons
    expect(allButtons.length).toBeGreaterThanOrEqual(3);
  });

  it("should show OPT badge when effect is once per turn", () => {
    const cardWithOPT: CardInfo = {
      ...mockCardInfo,
      effects: [
        {
          ...mockCardInfo.effects![0],
          isOPT: true,
        },
      ],
    };
    const getCardInfo = vi.fn().mockReturnValue(cardWithOPT);

    render(<OptionalTriggerPrompt {...defaultProps} getCardInfo={getCardInfo} />);

    expect(screen.getByText("Once per turn")).toBeInTheDocument();
  });

  it("should show HOPT badge when effect is hard once per turn", () => {
    const cardWithHOPT: CardInfo = {
      ...mockCardInfo,
      effects: [
        {
          ...mockCardInfo.effects![0],
          isHOPT: true,
        },
      ],
    };
    const getCardInfo = vi.fn().mockReturnValue(cardWithHOPT);

    render(<OptionalTriggerPrompt {...defaultProps} getCardInfo={getCardInfo} />);

    expect(screen.getByText("Hard once per turn")).toBeInTheDocument();
  });

  it("should show cost description when effect has a cost", () => {
    const cardWithCost: CardInfo = {
      ...mockCardInfo,
      effects: [
        {
          ...mockCardInfo.effects![0],
          cost: {
            type: "discard",
            value: 1,
            description: "Discard 1 card",
          },
        },
      ],
    };
    const getCardInfo = vi.fn().mockReturnValue(cardWithCost);

    render(<OptionalTriggerPrompt {...defaultProps} getCardInfo={getCardInfo} />);

    expect(screen.getByText(/Cost: Discard 1 card/i)).toBeInTheDocument();
  });

  it("should show card type badge", () => {
    const getCardInfo = vi.fn().mockReturnValue(mockCardInfo);

    render(<OptionalTriggerPrompt {...defaultProps} getCardInfo={getCardInfo} />);

    expect(screen.getByText("Monster")).toBeInTheDocument();
  });

  it("should display question prompt", () => {
    render(<OptionalTriggerPrompt {...defaultProps} />);

    expect(screen.getByText("Would you like to activate this effect?")).toBeInTheDocument();
  });

  it("should handle different trigger types with appropriate labels", () => {
    const destroyTrigger: PendingOptionalTrigger = {
      ...mockPendingTrigger,
      trigger: "on_destroy",
    };

    render(<OptionalTriggerPrompt {...defaultProps} pendingTriggers={[destroyTrigger]} />);

    expect(screen.getByText("When Destroyed")).toBeInTheDocument();
  });

  it("should show unknown trigger as-is when not in labels map", () => {
    const unknownTrigger: PendingOptionalTrigger = {
      ...mockPendingTrigger,
      trigger: "custom_unknown_trigger",
    };

    render(<OptionalTriggerPrompt {...defaultProps} pendingTriggers={[unknownTrigger]} />);

    expect(screen.getByText("custom_unknown_trigger")).toBeInTheDocument();
  });
});
