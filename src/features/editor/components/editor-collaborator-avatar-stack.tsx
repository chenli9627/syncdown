"use client";

import Image from "next/image";

type CollaboratorAvatar = {
  avatarUrl: string | null;
  color: string;
  name: string;
  userId: string;
};

type CollaboratorAvatarStackProps = {
  avatars: CollaboratorAvatar[];
};

export function getCollaboratorAvatarStackWidth(count: number) {
  if (count <= 0) {
    return 0;
  }

  const visibleCount = Math.min(count, 2);
  const overlapOffset = 14;
  const baseWidth = 20 + (visibleCount - 1) * overlapOffset;

  return count > 2 ? baseWidth + 22 : baseWidth;
}

export function CollaboratorAvatarStack({
  avatars,
}: CollaboratorAvatarStackProps) {
  if (avatars.length === 0) {
    return null;
  }

  const visibleAvatars = avatars.slice(0, 2);
  const overflowCount = avatars.length - visibleAvatars.length;

  return (
    <div className="pointer-events-none flex items-center -space-x-1.5">
      {visibleAvatars.map((avatar) =>
        avatar.avatarUrl ? (
          <Image
            alt=""
            className="size-5 rounded-full object-cover"
            data-collaborator-avatar="true"
            key={avatar.userId}
            src={avatar.avatarUrl}
            unoptimized
            width={20}
            height={20}
          />
        ) : (
          <span
            className="flex size-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
            data-collaborator-avatar="true"
            key={avatar.userId}
            style={{ backgroundColor: avatar.color }}
          >
            {avatar.name.slice(0, 1).toUpperCase()}
          </span>
        ),
      )}
      {overflowCount > 0 ? (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-card)] px-1 text-[9px] font-semibold text-[var(--color-muted-foreground)] shadow-[var(--shadow-whisper)]">
          +{overflowCount}
        </span>
      ) : null}
    </div>
  );
}
