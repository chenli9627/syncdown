"use client";

type EditorPermissionShareFormProps = {
  onShareEmailChange: (value: string) => void;
  onSharePermissionChange: (value: "can_edit" | "can_view") => void;
  onShareSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  permissionBusy: boolean;
  PermissionDropdown: React.ComponentType<{
    align?: "left" | "right";
    disabled?: boolean;
    onSelect: (value: "can_edit" | "can_view") => void;
    value: "can_edit" | "can_view";
    widthClassName?: string;
  }>;
  shareEmail: string;
  sharePermission: "can_edit" | "can_view";
};

export function EditorPermissionShareForm({
  onShareEmailChange,
  onSharePermissionChange,
  onShareSubmit,
  permissionBusy,
  PermissionDropdown,
  shareEmail,
  sharePermission,
}: EditorPermissionShareFormProps) {
  return (
    <form
      className="space-y-3 border-b border-[var(--color-border)] pb-4"
      onSubmit={(event) => {
        void onShareSubmit(event);
      }}
    >
      <div className="flex items-center gap-3">
        <input
          className="h-10 min-w-0 flex-1 border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-ring)_15%,transparent)]"
          onChange={(event) => {
            onShareEmailChange(event.target.value);
          }}
          placeholder="Email"
          spellCheck={false}
          type="email"
          value={shareEmail}
        />
        <PermissionDropdown
          onSelect={onSharePermissionChange}
          value={sharePermission}
          widthClassName="w-[108px]"
        />
        <button
          className="h-9 shrink-0 bg-[var(--color-primary)] px-3 text-xs font-semibold text-[var(--color-primary-foreground)] transition hover:brightness-95 disabled:opacity-50"
          disabled={permissionBusy}
          type="submit"
        >
          Share
        </button>
      </div>
    </form>
  );
}
