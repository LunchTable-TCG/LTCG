import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { TimeoutDisplay } from "../TimeoutDisplay";

describe("TimeoutDisplay", () => {
  const defaultProps = {
    actionTimeRemainingMs: 60000, // 1 minute
    matchTimeRemainingMs: 600000, // 10 minutes
    isWarning: false,
    isTimedOut: false,
    isMatchTimedOut: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Rendering", () => {
    it("should render the timeout display container", () => {
      render(<TimeoutDisplay {...defaultProps} />);

      expect(screen.getByTestId("timeout-display")).toBeInTheDocument();
    });

    it("should render action timer section", () => {
      render(<TimeoutDisplay {...defaultProps} />);

      expect(screen.getByTestId("action-timer")).toBeInTheDocument();
      expect(screen.getByText("Action")).toBeInTheDocument();
    });

    it("should render match timer section", () => {
      render(<TimeoutDisplay {...defaultProps} />);

      expect(screen.getByTestId("match-timer")).toBeInTheDocument();
      expect(screen.getByText("Match")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<TimeoutDisplay {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId("timeout-display")).toHaveClass("custom-class");
    });
  });

  describe("Time formatting", () => {
    it("should format action time as M:SS", () => {
      render(<TimeoutDisplay {...defaultProps} actionTimeRemainingMs={65000} />);

      // 65 seconds = 1:05
      expect(screen.getByTestId("action-timer")).toHaveTextContent("1:05");
    });

    it("should format match time as M:SS", () => {
      render(<TimeoutDisplay {...defaultProps} matchTimeRemainingMs={125000} />);

      // 125 seconds = 2:05
      expect(screen.getByTestId("match-timer")).toHaveTextContent("2:05");
    });

    it("should pad seconds with leading zero", () => {
      render(<TimeoutDisplay {...defaultProps} actionTimeRemainingMs={5000} />);

      // 5 seconds = 0:05
      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:05");
    });

    it("should show 0:00 for zero time", () => {
      render(<TimeoutDisplay {...defaultProps} actionTimeRemainingMs={0} />);

      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:00");
    });

    it("should show 0:00 for negative time", () => {
      render(<TimeoutDisplay {...defaultProps} actionTimeRemainingMs={-1000} />);

      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:00");
    });

    it("should round up milliseconds to next second", () => {
      render(<TimeoutDisplay {...defaultProps} actionTimeRemainingMs={1500} />);

      // 1.5 seconds rounds up to 2 = 0:02
      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:02");
    });
  });

  describe("Warning states", () => {
    it("should show warning styling when isWarning is true", () => {
      render(<TimeoutDisplay {...defaultProps} isWarning={true} />);

      const actionTimer = screen.getByTestId("action-timer");
      expect(actionTimer).toHaveClass("bg-amber-500/20");
      expect(actionTimer).toHaveClass("border-amber-500/50");
    });

    it("should not show warning styling when isWarning is false", () => {
      render(<TimeoutDisplay {...defaultProps} isWarning={false} />);

      const actionTimer = screen.getByTestId("action-timer");
      expect(actionTimer).not.toHaveClass("bg-amber-500/20");
    });

    it("should not show warning styling when already timed out", () => {
      render(
        <TimeoutDisplay {...defaultProps} isWarning={true} isTimedOut={true} />
      );

      const actionTimer = screen.getByTestId("action-timer");
      // Should show timeout styling instead
      expect(actionTimer).toHaveClass("bg-red-500/20");
    });
  });

  describe("Timeout states", () => {
    it("should show timeout styling when isTimedOut is true", () => {
      render(<TimeoutDisplay {...defaultProps} isTimedOut={true} />);

      const actionTimer = screen.getByTestId("action-timer");
      expect(actionTimer).toHaveClass("bg-red-500/20");
      expect(actionTimer).toHaveClass("border-red-500/50");
    });

    it("should show 0:00 for action time when timed out", () => {
      render(
        <TimeoutDisplay
          {...defaultProps}
          actionTimeRemainingMs={30000}
          isTimedOut={true}
        />
      );

      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:00");
    });

    it("should show match timeout styling when isMatchTimedOut is true", () => {
      render(<TimeoutDisplay {...defaultProps} isMatchTimedOut={true} />);

      const matchTimer = screen.getByTestId("match-timer");
      expect(matchTimer).toHaveClass("bg-red-500/20");
      expect(matchTimer).toHaveClass("border-red-500/50");
    });

    it("should show 0:00 for match time when match timed out", () => {
      render(
        <TimeoutDisplay
          {...defaultProps}
          matchTimeRemainingMs={300000}
          isMatchTimedOut={true}
        />
      );

      expect(screen.getByTestId("match-timer")).toHaveTextContent("0:00");
    });
  });

  describe("Match time low warning", () => {
    it("should show low match time styling when under 5 minutes", () => {
      render(
        <TimeoutDisplay {...defaultProps} matchTimeRemainingMs={299000} /> // Just under 5 minutes
      );

      const matchTimer = screen.getByTestId("match-timer");
      expect(matchTimer).toHaveClass("bg-amber-500/10");
    });

    it("should not show low match time styling when at 5 minutes or more", () => {
      render(
        <TimeoutDisplay {...defaultProps} matchTimeRemainingMs={300001} /> // Just over 5 minutes
      );

      const matchTimer = screen.getByTestId("match-timer");
      expect(matchTimer).not.toHaveClass("bg-amber-500/10");
    });

    it("should not show low match time styling when match timed out", () => {
      render(
        <TimeoutDisplay
          {...defaultProps}
          matchTimeRemainingMs={60000}
          isMatchTimedOut={true}
        />
      );

      const matchTimer = screen.getByTestId("match-timer");
      // Should show timeout styling instead
      expect(matchTimer).toHaveClass("bg-red-500/20");
      expect(matchTimer).not.toHaveClass("bg-amber-500/10");
    });
  });

  describe("Countdown behavior", () => {
    it("should countdown action time every second", () => {
      render(<TimeoutDisplay {...defaultProps} actionTimeRemainingMs={10000} />);

      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:10");

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:09");

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:07");
    });

    it("should countdown match time every second", () => {
      render(<TimeoutDisplay {...defaultProps} matchTimeRemainingMs={65000} />);

      expect(screen.getByTestId("match-timer")).toHaveTextContent("1:05");

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId("match-timer")).toHaveTextContent("1:04");
    });

    it("should not go below 0:00 during countdown", () => {
      render(<TimeoutDisplay {...defaultProps} actionTimeRemainingMs={2000} />);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:00");
    });

    it("should stop action countdown when timed out", () => {
      const { rerender } = render(
        <TimeoutDisplay {...defaultProps} actionTimeRemainingMs={10000} />
      );

      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:10");

      // Simulate becoming timed out
      rerender(
        <TimeoutDisplay
          {...defaultProps}
          actionTimeRemainingMs={10000}
          isTimedOut={true}
        />
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should show 0:00 regardless of internal state
      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:00");
    });

    it("should stop match countdown when match timed out", () => {
      const { rerender } = render(
        <TimeoutDisplay {...defaultProps} matchTimeRemainingMs={65000} />
      );

      rerender(
        <TimeoutDisplay
          {...defaultProps}
          matchTimeRemainingMs={65000}
          isMatchTimedOut={true}
        />
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should show 0:00 when match timed out
      expect(screen.getByTestId("match-timer")).toHaveTextContent("0:00");
    });

    it("should stop all countdowns when both timers are timed out", () => {
      render(
        <TimeoutDisplay
          {...defaultProps}
          isTimedOut={true}
          isMatchTimedOut={true}
        />
      );

      // The interval should not be running, but we test the display
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:00");
      expect(screen.getByTestId("match-timer")).toHaveTextContent("0:00");
    });
  });

  describe("Props updates", () => {
    it("should sync action time when props change", () => {
      const { rerender } = render(
        <TimeoutDisplay {...defaultProps} actionTimeRemainingMs={10000} />
      );

      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:10");

      rerender(
        <TimeoutDisplay {...defaultProps} actionTimeRemainingMs={30000} />
      );

      expect(screen.getByTestId("action-timer")).toHaveTextContent("0:30");
    });

    it("should sync match time when props change", () => {
      const { rerender } = render(
        <TimeoutDisplay {...defaultProps} matchTimeRemainingMs={60000} />
      );

      expect(screen.getByTestId("match-timer")).toHaveTextContent("1:00");

      rerender(
        <TimeoutDisplay {...defaultProps} matchTimeRemainingMs={120000} />
      );

      expect(screen.getByTestId("match-timer")).toHaveTextContent("2:00");
    });
  });

  describe("Icons", () => {
    it("should show an icon for normal action state", () => {
      render(<TimeoutDisplay {...defaultProps} />);

      const actionTimer = screen.getByTestId("action-timer");
      // SVG icon should be present
      expect(actionTimer.querySelector("svg")).toBeInTheDocument();
    });

    it("should show an icon for warning action state", () => {
      render(<TimeoutDisplay {...defaultProps} isWarning={true} />);

      const actionTimer = screen.getByTestId("action-timer");
      // SVG icon should be present (AlertTriangle in this case)
      expect(actionTimer.querySelector("svg")).toBeInTheDocument();
    });

    it("should show an icon for timed out action state", () => {
      render(<TimeoutDisplay {...defaultProps} isTimedOut={true} />);

      const actionTimer = screen.getByTestId("action-timer");
      // SVG icon should be present (AlertTriangle in this case)
      expect(actionTimer.querySelector("svg")).toBeInTheDocument();
    });

    it("should show an icon for normal match state", () => {
      render(<TimeoutDisplay {...defaultProps} />);

      const matchTimer = screen.getByTestId("match-timer");
      // SVG icon should be present (Clock in this case)
      expect(matchTimer.querySelector("svg")).toBeInTheDocument();
    });

    it("should show an icon for match timed out state", () => {
      render(<TimeoutDisplay {...defaultProps} isMatchTimedOut={true} />);

      const matchTimer = screen.getByTestId("match-timer");
      // SVG icon should be present (AlertTriangle in this case)
      expect(matchTimer.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Large time values", () => {
    it("should handle hours correctly", () => {
      render(
        <TimeoutDisplay {...defaultProps} matchTimeRemainingMs={3661000} /> // 1 hour, 1 minute, 1 second
      );

      // Should show 61:01 (minutes:seconds)
      expect(screen.getByTestId("match-timer")).toHaveTextContent("61:01");
    });
  });
});
