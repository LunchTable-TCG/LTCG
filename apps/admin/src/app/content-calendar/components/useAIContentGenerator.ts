"use client";

import { typedApi } from "@/lib/convexHelpers";
import { useTypedAction } from "@ltcg/core/react";
import type { FunctionReference } from "convex/server";
import { useCallback, useState } from "react";

type ContentType = "blog" | "x_post" | "reddit" | "email" | "announcement" | "news" | "image";

// Prompt templates for each content type
const PROMPT_TEMPLATES: Record<ContentType, string> = {
  blog: `Write a blog post about the following topic for a trading card game called Lunchtable.
The blog should be engaging, informative, and targeted at card game enthusiasts.
Return ONLY a JSON object with "title" and "content" fields. The content should be in markdown format.

Topic: {prompt}`,

  x_post: `Write a Twitter/X post about the following topic for Lunchtable, a trading card game.
The post must be under 280 characters, engaging, and include relevant hashtags.
Return ONLY a JSON object with "title" (a short summary) and "content" (the tweet text).

Topic: {prompt}`,

  reddit: `Write a Reddit post about the following topic for the Lunchtable trading card game community.
The post should be conversational, engaging, and encourage discussion.
Return ONLY a JSON object with "title" (the Reddit post title) and "content" (the post body in markdown).

Topic: {prompt}`,

  email: `Write a marketing email about the following topic for Lunchtable, a trading card game.
The email should be professional, engaging, and include a clear call-to-action.
Support HTML formatting. Use {{name}} as a placeholder for the recipient's name.
Return ONLY a JSON object with "title" (email subject line) and "content" (email body in HTML).

Topic: {prompt}`,

  announcement: `Write an in-game announcement about the following topic for Lunchtable players.
The announcement should be clear, concise, and exciting.
Return ONLY a JSON object with "title" (short headline) and "content" (announcement message).

Topic: {prompt}`,

  news: `Write a news article about the following topic for the Lunchtable Chronicles news section.
The article should be informative, professional, and newsworthy.
Return ONLY a JSON object with "title" (headline) and "content" (article body in markdown).

Topic: {prompt}`,

  image: `Write a caption for an image post about the following topic for Lunchtable, a trading card game.
The caption should be engaging and suitable for social media.
Return ONLY a JSON object with "title" (short alt text) and "content" (the caption).

Topic: {prompt}`,
};

interface GeneratedContent {
  title: string;
  content: string;
}

export function useAIContentGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the admin agent API
  const sendMessageAction = typedApi.ai.adminAgentApi.sendMessage as FunctionReference<"action">;
  const sendMessage = useTypedAction(sendMessageAction);
  const getOrCreateThreadAction = typedApi.ai.adminAgentApi
    .getOrCreateThread as FunctionReference<"action">;
  const getOrCreateThread = useTypedAction(getOrCreateThreadAction);

  const generateContent = useCallback(
    async (type: ContentType, userPrompt: string): Promise<GeneratedContent> => {
      setIsGenerating(true);
      setError(null);

      try {
        // Get or create a thread for content generation
        const threadResult = (await getOrCreateThread({})) as { threadId: string };
        const threadId = threadResult.threadId;

        // Build the prompt
        const template = PROMPT_TEMPLATES[type];
        const fullPrompt = template.replace("{prompt}", userPrompt);

        // Send to AI
        const result = (await sendMessage({
          threadId,
          content: fullPrompt,
        })) as { response: string; toolCalls?: unknown[] };

        // Parse the response - try to extract JSON
        const responseText = result.response;

        // Try to find JSON in the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              title: parsed.title || "",
              content: parsed.content || "",
            };
          } catch {
            // JSON parsing failed, use response as content
          }
        }

        // Fallback: use response as content
        return {
          title: userPrompt.slice(0, 100),
          content: responseText,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate content";
        setError(message);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [getOrCreateThread, sendMessage]
  );

  return {
    generateContent,
    isGenerating,
    error,
  };
}
