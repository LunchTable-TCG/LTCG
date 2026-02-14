import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type GamePhase, PhaseSkipButtons } from "@/components/game/controls/PhaseSkipButtons";

// Mock convex helpers
const mockSkipBattlePhase = vi.fn();
const mockSkipToEndPhase = vi.fn();
const mockSkipMainPhase2 = vi.fn();

vi.mock("@/lib/convexHelpers", () => ({
  typedApi: {
    gameplay: {
      phaseManager: {
        skipBattlePhase: "skipBattlePhase",
        skipToEndPhase: "skipToEndPhase",
        skipMainPhase2: "skipMainPhase2",
      },
    },
  },
  apiAny: {
    gameplay: {
      phaseManager: {
        skipBattlePhase: "skipBattlePhase",
        skipToEndPhase: "skipToEndPhase",
        skipMainPhase2: "skipMainPhase2",
      },
    },
  },
  useConvexMutation: vi.fn((path) => {
    if (path === "skipBattlePhase") return mockSkipBattlePhase;
    if (path === "skipToEndPhase") return mockSkipToEndPhase;
    if (path === "skipMainPhase2") return mockSkipMainPhase2;
    return vi.fn();
  }),
}));

describe("PhaseSkipButtons", () => {
  const mockLobbyId = "lobby123";
  const mockOnPhaseChange = vi.fn();

  const defaultProps = {
    lobbyId: mockLobbyId,
    currentPhase: "main" as GamePhase,
    isCurrentPlayerTurn: true,
    onPhaseChange: mockOnPhaseChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default successful responses
    mockSkipBattlePhase.mockResolvedValue({ success: true, newPhase: "end" });
    mockSkipToEndPhase.mockResolvedValue({ success: true, newPhase: "end" });
    mockSkipMainPhase2.mockResolvedValue({ success: true, newPhase: "end" });
  });

  describe("Rendering based on phase", () => {
    it("should render Skip Combat, Skip to End, and End Turn buttons during main phase", () => {
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      expect(screen.getByTestId("skip-battle-btn")).toBeInTheDocument();
      expect(screen.getByTestId("skip-to-end-btn")).toBeInTheDocument();
      expect(screen.getByTestId("end-turn-btn")).toBeInTheDocument();
    });

    it("should render Skip to End and End Turn buttons during combat phase", () => {
      render(<PhaseSkipButtons {...defaultProps} currentPhase="combat" />);

      expect(screen.queryByTestId("skip-battle-btn")).not.toBeInTheDocument();
      expect(screen.getByTestId("skip-to-end-btn")).toBeInTheDocument();
      expect(screen.getByTestId("end-turn-btn")).toBeInTheDocument();
    });

    it("should not render during draw phase", () => {
      const { container } = render(<PhaseSkipButtons {...defaultProps} currentPhase="draw" />);

      expect(container.firstChild).toBeNull();
    });

    it("should not render during breakdown_check phase", () => {
      const { container } = render(
        <PhaseSkipButtons {...defaultProps} currentPhase="breakdown_check" />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should not render during end phase", () => {
      const { container } = render(<PhaseSkipButtons {...defaultProps} currentPhase="end" />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Button disabled states", () => {
    it("should disable buttons when not current player's turn", () => {
      render(
        <PhaseSkipButtons {...defaultProps} currentPhase="main" isCurrentPlayerTurn={false} />
      );

      expect(screen.getByTestId("skip-battle-btn")).toBeDisabled();
      expect(screen.getByTestId("skip-to-end-btn")).toBeDisabled();
    });

    it("should enable buttons when it is current player's turn", () => {
      render(
        <PhaseSkipButtons {...defaultProps} currentPhase="main" isCurrentPlayerTurn={true} />
      );

      expect(screen.getByTestId("skip-battle-btn")).not.toBeDisabled();
      expect(screen.getByTestId("skip-to-end-btn")).not.toBeDisabled();
    });
  });

  describe("Skip Combat button interactions", () => {
    it("should call skipBattlePhase mutation when clicked during main", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const skipButton = screen.getByTestId("skip-battle-btn");
      await user.click(skipButton);

      await waitFor(() => {
        expect(mockSkipBattlePhase).toHaveBeenCalledWith({
          lobbyId: mockLobbyId,
        });
      });
    });

    it("should call onPhaseChange with new phase after successful skip", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const skipButton = screen.getByTestId("skip-battle-btn");
      await user.click(skipButton);

      await waitFor(() => {
        expect(mockOnPhaseChange).toHaveBeenCalledWith("end");
      });
    });

    it("should not call onPhaseChange when skip fails", async () => {
      mockSkipBattlePhase.mockResolvedValue({ success: false });

      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const skipButton = screen.getByTestId("skip-battle-btn");
      await user.click(skipButton);

      await waitFor(() => {
        expect(mockSkipBattlePhase).toHaveBeenCalled();
      });

      expect(mockOnPhaseChange).not.toHaveBeenCalled();
    });

    it("should disable buttons during loading state", async () => {
      // Make mutation take time
      mockSkipBattlePhase.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const skipButton = screen.getByTestId("skip-battle-btn");
      await user.click(skipButton);

      // Buttons should be disabled while loading
      expect(screen.getByTestId("skip-battle-btn")).toBeDisabled();
      expect(screen.getByTestId("skip-to-end-btn")).toBeDisabled();
    });
  });

  describe("Skip to End button interactions", () => {
    it("should call skipToEndPhase mutation when clicked", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const skipToEndButton = screen.getByTestId("skip-to-end-btn");
      await user.click(skipToEndButton);

      await waitFor(() => {
        expect(mockSkipToEndPhase).toHaveBeenCalledWith({
          lobbyId: mockLobbyId,
        });
      });
    });

    it("should call onPhaseChange with end phase after successful skip", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const skipToEndButton = screen.getByTestId("skip-to-end-btn");
      await user.click(skipToEndButton);

      await waitFor(() => {
        expect(mockOnPhaseChange).toHaveBeenCalledWith("end");
      });
    });

    it("should show skip to end during combat phase", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="combat" />);

      const skipToEndButton = screen.getByTestId("skip-to-end-btn");
      await user.click(skipToEndButton);

      await waitFor(() => {
        expect(mockSkipToEndPhase).toHaveBeenCalledWith({
          lobbyId: mockLobbyId,
        });
      });
    });
  });

  describe("End Turn button interactions", () => {
    it("should call skipMainPhase2 mutation when clicked during main", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const endTurnButton = screen.getByTestId("end-turn-btn");
      await user.click(endTurnButton);

      await waitFor(() => {
        expect(mockSkipMainPhase2).toHaveBeenCalledWith({
          lobbyId: mockLobbyId,
        });
      });
    });

    it("should call skipMainPhase2 mutation when clicked during combat", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="combat" />);

      const endTurnButton = screen.getByTestId("end-turn-btn");
      await user.click(endTurnButton);

      await waitFor(() => {
        expect(mockSkipMainPhase2).toHaveBeenCalledWith({
          lobbyId: mockLobbyId,
        });
      });
    });

    it("should call onPhaseChange with end phase after successful end turn", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const endTurnButton = screen.getByTestId("end-turn-btn");
      await user.click(endTurnButton);

      await waitFor(() => {
        expect(mockOnPhaseChange).toHaveBeenCalledWith("end");
      });
    });
  });

  describe("Error handling", () => {
    it("should handle mutation errors gracefully", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockSkipBattlePhase.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const skipButton = screen.getByTestId("skip-battle-btn");
      await user.click(skipButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to skip battle phase:",
          expect.any(Error)
        );
      });

      // Button should be re-enabled after error
      await waitFor(() => {
        expect(screen.getByTestId("skip-battle-btn")).not.toBeDisabled();
      });

      consoleError.mockRestore();
    });

    it("should handle skipToEndPhase errors gracefully", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockSkipToEndPhase.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const skipButton = screen.getByTestId("skip-to-end-btn");
      await user.click(skipButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to skip to end phase:",
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it("should handle endTurn errors gracefully", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockSkipMainPhase2.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const skipButton = screen.getByTestId("end-turn-btn");
      await user.click(skipButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith("Failed to end turn:", expect.any(Error));
      });

      consoleError.mockRestore();
    });
  });

  describe("Button text", () => {
    it("should show Skip Combat text on skip battle button", () => {
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const button = screen.getByTestId("skip-battle-btn");
      expect(button).toHaveTextContent(/Skip Combat|Skip/);
    });

    it("should show Skip to End text on skip to end button", () => {
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const button = screen.getByTestId("skip-to-end-btn");
      expect(button).toHaveTextContent(/Skip to End|End/);
    });

    it("should show End Turn text on end turn button", () => {
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main" />);

      const button = screen.getByTestId("end-turn-btn");
      expect(button).toHaveTextContent(/End Turn|End/);
    });
  });

  describe("Without onPhaseChange callback", () => {
    it("should work without onPhaseChange callback", async () => {
      const user = userEvent.setup();
      render(
        <PhaseSkipButtons lobbyId={mockLobbyId} currentPhase="main" isCurrentPlayerTurn={true} />
      );

      const skipButton = screen.getByTestId("skip-battle-btn");
      await user.click(skipButton);

      await waitFor(() => {
        expect(mockSkipBattlePhase).toHaveBeenCalled();
      });

      // Should not throw even without onPhaseChange
    });
  });
});
