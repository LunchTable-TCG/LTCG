"use client";

interface Decision {
  turnNumber?: number;
  action: string;
  reasoning?: string;
  timestamp?: number;
  createdAt?: number;
}

interface DecisionPanelProps {
  decisions: Decision[];
  agentName: string;
}

export function DecisionPanel({ decisions, agentName }: DecisionPanelProps) {
  return (
    <div className="decision-panel">
      <div className="decision-panel__header">
        <span className="decision-panel__icon">🧠</span>
        <h3 className="decision-panel__title">{agentName}'s Thinking</h3>
      </div>

      <div className="decision-panel__content">
        {decisions.length === 0 ? (
          <div className="decision-panel__thinking">
            <div className="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Analyzing the board...</p>
          </div>
        ) : (
          <ul className="decision-panel__list">
            {decisions.map((decision, idx) => (
              <li
                key={decision.timestamp || decision.createdAt || idx}
                className="decision-panel__item"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {decision.turnNumber && (
                  <div className="decision-panel__turn">Turn {decision.turnNumber}</div>
                )}
                <div className="decision-panel__action">{decision.action}</div>
                {decision.reasoning && (
                  <div className="decision-panel__reasoning">{decision.reasoning}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <style jsx>{`
        .decision-panel {
          background: rgba(0, 0, 0, 0.5);
          border-radius: 12px;
          padding: 20px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .decision-panel__header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .decision-panel__icon {
          font-size: 28px;
        }

        .decision-panel__title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .decision-panel__content {
          flex: 1;
          overflow-y: auto;
        }

        .decision-panel__thinking {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
        }

        .thinking-dots {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .thinking-dots span {
          width: 12px;
          height: 12px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite;
        }

        .thinking-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .thinking-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
        }

        .decision-panel__list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .decision-panel__item {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 16px;
          animation: fadeIn 0.3s ease-out forwards;
          opacity: 0;
        }

        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }

        .decision-panel__turn {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.6;
          margin-bottom: 4px;
        }

        .decision-panel__action {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .decision-panel__reasoning {
          font-size: 14px;
          opacity: 0.8;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
