import { redirect } from "next/navigation";

/**
 * Legacy setup-username page - redirects to unified onboarding.
 */
export default function SetupUsernamePage() {
  redirect("/onboarding");
}
