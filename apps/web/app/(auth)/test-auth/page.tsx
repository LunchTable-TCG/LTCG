"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export default function TestAuthPage() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"signUp" | "signIn">("signUp");
  const [error, setError] = useState("");

  return (
    <div style={{ padding: "50px", maxWidth: "400px", margin: "0 auto" }}>
      <h1>MINIMAL AUTH TEST</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          const formData = new FormData(event.currentTarget);

          console.log("Submitting:", {
            email: formData.get("email"),
            password: formData.get("password"),
            name: formData.get("name"),
            flow: formData.get("flow"),
          });

          signIn("password", formData)
            .then(() => {
              console.log("✅ SUCCESS");
              window.location.href = "/lunchtable";
            })
            .catch((err) => {
              console.error("❌ ERROR:", err);
              setError(err.message || "Failed");
            });
        }}
      >
        {step === "signUp" && (
          <div>
            <label>Name:</label>
            <input name="name" type="text" required />
          </div>
        )}

        <div>
          <label>Email:</label>
          <input name="email" type="email" required />
        </div>

        <div>
          <label>Password:</label>
          <input name="password" type="password" required />
        </div>

        <input name="flow" type="hidden" value={step} />

        <button type="submit">{step === "signIn" ? "Sign in" : "Sign up"}</button>

        <button type="button" onClick={() => setStep(step === "signIn" ? "signUp" : "signIn")}>
          {step === "signIn" ? "Sign up instead" : "Sign in instead"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
