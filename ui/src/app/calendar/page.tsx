"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { WeekView } from "@/components/calendar/WeekView";
import { PostChip, type ScheduledPost } from "@/components/calendar/PostChip";
import { PageTransition } from "@/components/ui/PageTransition";

export default function CalendarPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [activePost, setActivePost] = useState<ScheduledPost | null>(null);

  const fetchPosts = useCallback(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((data) => setPosts(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const reschedule = async (id: string, newScheduledFor: string) => {
    await fetch(`/api/calendar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor: newScheduledFor }),
    });
    fetchPosts();
  };

  const handleDragStart = (event: DragStartEvent) => {
    const post = posts.find((p) => p.id === event.active.id);
    setActivePost(post ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePost(null);
    const { active, over } = event;
    if (!over) return;

    const postId = active.id as string;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const target = over.id as string;

    if (target.startsWith("hour:")) {
      const payload = target.slice(5);
      const newDate = payload.slice(0, 10);
      const newHour = payload.slice(11, 13);
      const oldMinutes = post.scheduledFor.slice(14, 16);
      reschedule(postId, `${newDate}T${newHour}:${oldMinutes}:00.000Z`);
    }
  };

  return (
    <PageTransition>
      <div className="p-10 space-y-8">
        <h1 className="text-xl font-semibold">Publishing Calendar</h1>
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <WeekView posts={posts} />
          <DragOverlay dropAnimation={null}>
            {activePost && <PostChip post={activePost} compact overlay />}
          </DragOverlay>
        </DndContext>
      </div>
    </PageTransition>
  );
}
