"use client";

import { useCallback } from "react";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import { CopyIcon, CheckIcon } from "lucide-react";
import { useState } from "react";

interface AiMessageProps {
  content: string;
}

export function AiMessage({ content }: AiMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <Message from="assistant">
      <MessageContent>
        <MessageResponse>{content}</MessageResponse>
      </MessageContent>
      <MessageActions>
        <MessageAction
          tooltip="Copy"
          onClick={handleCopy}
        >
          {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
        </MessageAction>
      </MessageActions>
    </Message>
  );
}
