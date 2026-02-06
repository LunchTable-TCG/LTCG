"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const getErrorMessage = () => {
    switch (reason) {
      case "missing_credentials":
        return "Missing authentication credentials. Please ensure you have a valid access link.";
      case "invalid_token":
        return "Invalid or expired access token. Please request a new access link.";
      case "verification_failed":
        return "Token verification failed. Please try again or request a new access link.";
      default:
        return "You do not have permission to access this page.";
    }
  };

  const getErrorTitle = () => {
    switch (reason) {
      case "missing_credentials":
        return "Missing Credentials";
      case "invalid_token":
        return "Invalid Token";
      case "verification_failed":
        return "Verification Failed";
      default:
        return "Unauthorized Access";
    }
  };

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-container">
        <div className="unauthorized-icon">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h1 className="unauthorized-title">{getErrorTitle()}</h1>
        <p className="unauthorized-message">{getErrorMessage()}</p>
        <div className="unauthorized-actions">
          <a href="/" className="unauthorized-button">
            Return to Home
          </a>
        </div>
      </div>

      <style jsx>{`
        .unauthorized-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
          padding: 20px;
        }

        .unauthorized-container {
          max-width: 500px;
          text-align: center;
          color: white;
        }

        .unauthorized-icon {
          margin-bottom: 24px;
          color: #ef4444;
          display: flex;
          justify-content: center;
        }

        .unauthorized-title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 16px;
          color: white;
        }

        .unauthorized-message {
          font-size: 18px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 32px;
        }

        .unauthorized-actions {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .unauthorized-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s;
        }

        .unauthorized-button:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        @media (max-width: 640px) {
          .unauthorized-title {
            font-size: 24px;
          }

          .unauthorized-message {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense
      fallback={
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)",
          color: "white"
        }}>
          Loading...
        </div>
      }
    >
      <UnauthorizedContent />
    </Suspense>
  );
}
