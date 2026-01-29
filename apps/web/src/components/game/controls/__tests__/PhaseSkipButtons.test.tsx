import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhaseSkipButtons, type GamePhase } from "../PhaseSkipButtons";

// Mock convex helpers
const mockSkipBattlePhase = vi.fn();
const mockSkipToEndPhase = vi.fn();
const mockSkipMainPhase2 = vi.fn();

vi.mock("@/lib/convexHelpers", () => ({
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
    currentPhase: "main1" as GamePhase,
    isCurrentPlayerTurn: true,
    onPhaseChange: mockOnPhaseChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default successful responses
    mockSkipBattlePhase.mockResolvedValue({ success: true, newPhase: "main2" });
    mockSkipToEndPhase.mockResolvedValue({ success: true, newPhase: "end" });
    mockSkipMainPhase2.mockResolvedValue({ success: true, newPhase: "end" });
  });

  describe("Rendering based on phase", () => {
    it("should render Skip Battle and Skip to End buttons during main1 phase", () => {
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main1" />);

      expect(screen.getByTestId("skip-battle-btn")).toBeInTheDocument();
      expect(screen.getByTestId("skip-to-end-btn")).toBeInTheDocument();
      expect(screen.queryByTestId("end-turn-btn")).not.toBeInTheDocument();
    });

    it("should render To Main 2 and Skip to End buttons during battle phases", () => {
      const battlePhases: GamePhase[] = ["battle_start", "battle", "battle_end"];

      for (const phase of battlePhases) {
        const { unmount } = render(
          <PhaseSkipButtons {...defaultProps} currentPhase={phase} />
        );

        expect(screen.getByTestId("skip-to-main2-btn")).toBeInTheDocument();
        expect(screen.getByTestId("skip-to-end-btn")).toBeInTheDocument();
        expect(screen.queryByTestId("end-turn-btn")).not.toBeInTheDocument();

        unmount();
      }
    });

    it("should render End Turn button during main2 phase", () => {
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main2" />);

      expect(screen.getByTestId("end-turn-btn")).toBeInTheDocument();
      expect(screen.queryByTestId("skip-battle-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("skip-to-end-btn")).not.toBeInTheDocument();
    });

    it("should not render during draw phase", () => {
      const { container } = render(
        <PhaseSkipButtons {...defaultProps} currentPhase="draw" />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should not render during standby phase", () => {
      const { container } = render(
        <PhaseSkipButtons {...defaultProps} currentPhase="standby" />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should not render during end phase", () => {
      const { container } = render(
        <PhaseSkipButtons {...defaultProps} currentPhase="end" />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Button disabled states", () => {
    it("should disable buttons when not current player's turn", () => {
      render(
        <PhaseSkipButtons
          {...defaultProps}
          currentPhase="main1"
          isCurrentPlayerTurn={false}
        />
      );

      expect(screen.getByTestId("skip-battle-btn")).toBeDisabled();
      expect(screen.getByTestId("skip-to-end-btn")).toBeDisabled();
    });

    it("should enable buttons when it is current player's turn", () => {
      render(
        <PhaseSkipButtons
          {...defaultProps}
          currentPhase="main1"
          isCurrentPlayerTurn={true}
        />
      );

      expect(screen.getByTestId("skip-battle-btn")).not.toBeDisabled();
      expect(screen.getByTestId("skip-to-end-btn")).not.toBeDisabled();
    });
  });

  describe("Skip Battle button interactions", () => {
    it("should call skipBattlePhase mutation when clicked during main1", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main1" />);

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
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main1" />);

      const skipButton = screen.getByTestId("skip-battle-btn");
      await user.click(skipButton);

      await waitFor(() => {
        expect(mockOnPhaseChange).toHaveBeenCalledWith("main2");
      });
    });

    it("should not call onPhaseChange when skip fails", async () => {
      mockSkipBattlePhase.mockResolvedValue({ success: false });

      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main1" />);

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
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main1" />);

      const skipButton = screen.getByTestId("skip-battle-btn");
      await user.click(skipButton);

      // Buttons should be disabled while loading
      expect(screen.getByTestId("skip-battle-btn")).toBeDisabled();
      expect(screen.getByTestId("skip-to-end-btn")).toBeDisabled();
    });
  });

  describe("Skip to Main 2 button interactions", () => {
    it("should call skipBattlePhase mutation during battle phase", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="battle" />);

      const skipToMain2Button = screen.getByTestId("skip-to-main2-btn");
      await user.click(skipToMain2Button);

      await waitFor(() => {
        expect(mockSkipBattlePhase).toHaveBeenCalledWith({
          lobbyId: mockLobbyId,
        });
      });
    });
  });

  describe("Skip to End button interactions", () => {
    it("should call skipToEndPhase mutation when clicked", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main1" />);

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
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main1" />);

      const skipToEndButton = screen.getByTestId("skip-to-end-btn");
      await user.click(skipToEndButton);

      await waitFor(() => {
        expect(mockOnPhaseChange).toHaveBeenCalledWith("end");
      });
    });
  });

  describe("End Turn button interactions", () => {
    it("should call skipMainPhase2 mutation when clicked during main2", async () => {
      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main2" />);

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
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main2" />);

      const endTurnButton = screen.getByTestId("end-turn-btn");
      await user.click(endTurnButton);

      await waitFor(() => {
        expect(mockOnPhaseChange).toHaveBeenCalledWith("end");
      });
    });
  });

  describe("Error handling", () => {
    it("should handle mutation errors gracefully", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockSkipBattlePhase.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main1" />);

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
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockSkipToEndPhase.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main1" />);

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
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockSkipMainPhase2.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main2" />);

      const skipButton = screen.getByTestId("end-turn-btn");
      await user.click(skipButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to end turn:",
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe("Button text", () => {
    it("should show Skip Battle text on skip battle button", () => {
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main1" />);

      const button = screen.getByTestId("skip-battle-btn");
      expect(button).toHaveTextContent(/Skip Battle|Skip/);
    });

    it("should show To Main 2 text on skip to main2 button", () => {
      render(<PhaseSkipButtons {...defaultProps} currentPhase="battle" />);

      const button = screen.getByTestId("skip-to-main2-btn");
      expect(button).toHaveTextContent(/To Main 2|M2/);
    });

    it("should show Skip to End text on skip to end button", () => {
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main1" />);

      const button = screen.getByTestId("skip-to-end-btn");
      expect(button).toHaveTextContent(/Skip to End|End/);
    });

    it("should show End Turn text on end turn button", () => {
      render(<PhaseSkipButtons {...defaultProps} currentPhase="main2" />);

      const button = screen.getByTestId("end-turn-btn");
      expect(button).toHaveTextContent(/End Turn|End/);
    });
  });

  describe("Without onPhaseChange callback", () => {
    it("should work without onPhaseChange callback", async () => {
      const user = userEvent.setup();
      render(
        <PhaseSkipButtons
          lobbyId={mockLobbyId}
          currentPhase="main1"
          isCurrentPlayerTurn={true}
        />
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
