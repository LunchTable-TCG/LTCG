"use client";

/**
 * Seasons Page (Not Implemented)
 *
 * Season management will be implemented in a future update.
 */

import { PageWrapper } from "@/components/layout";
import { Card, Title, Text } from "@tremor/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SeasonsPage() {
  return (
    <PageWrapper
      title="Seasons"
      description="Season management (coming soon)"
    >
      <Card className="p-8 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <Title className="mb-2">Season Management Coming Soon</Title>
        <Text className="mb-6">
          Season management features are not yet implemented. This will include:
          <ul className="mt-4 text-left max-w-md mx-auto space-y-2">
            <li>• Create and manage competitive seasons</li>
            <li>• Track seasonal rankings</li>
            <li>• Configure season rewards</li>
            <li>• View historical season data</li>
          </ul>
        </Text>
        <Button asChild>
          <Link href="/">Return to Dashboard</Link>
        </Button>
      </Card>
    </PageWrapper>
  );
}
