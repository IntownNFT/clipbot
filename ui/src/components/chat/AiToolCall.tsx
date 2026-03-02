"use client";

import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import type { AiToolCallEvent } from "@/hooks/useAiChat";

const TOOL_TITLES: Record<string, string> = {
  list_spaces: "List Spaces",
  create_space: "Create Space",
  get_runs: "Get Runs",
  schedule_clip: "Schedule Clip",
  list_scheduled: "List Scheduled Posts",
  list_creators: "List Creators",
  add_creator: "Add Creator",
  get_settings: "Get Settings",
  process_video: "Process Video",
  get_run_detail: "Get Run Details",
  get_clips: "Get Clips",
  check_creator_videos: "Check Creator Videos",
  publish_clip: "Publish Clip",
  list_posts: "List Posts",
  get_post_analytics: "Post Analytics",
  update_post: "Update Post",
  delete_post: "Delete Post",
  list_accounts: "List Accounts",
  get_notifications: "Get Notifications",
  remove_creator: "Remove Creator",
  cancel_run: "Cancel Run",
  cancel_scheduled: "Cancel Scheduled Post",
};

/** Map our custom states to AI SDK ToolUIPart states */
function mapState(status: AiToolCallEvent["status"]) {
  switch (status) {
    case "running":
      return "input-available" as const;
    case "done":
      return "output-available" as const;
    case "error":
      return "output-error" as const;
  }
}

interface AiToolCallProps {
  toolCall: AiToolCallEvent;
}

export function AiToolCall({ toolCall }: AiToolCallProps) {
  const title = TOOL_TITLES[toolCall.name] ?? toolCall.name;
  const state = mapState(toolCall.status);
  const hasOutput = toolCall.status === "done" || toolCall.status === "error";

  return (
    <Tool defaultOpen={hasOutput}>
      <ToolHeader
        type={`tool-${toolCall.name}` as `tool-${string}`}
        state={state}
        title={title}
      />
      <ToolContent>
        {toolCall.input && Object.keys(toolCall.input).length > 0 && (
          <ToolInput input={toolCall.input} />
        )}
        {hasOutput && (
          <ToolOutput
            output={toolCall.result ?? undefined}
            errorText={toolCall.error ?? undefined}
          />
        )}
      </ToolContent>
    </Tool>
  );
}
