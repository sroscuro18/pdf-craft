import { Trash2, GripVertical } from "lucide-react";

export type ListItem = { id: string; name: string; size: number };

export function FileList({
  items,
  onRemove,
  onReorder,
}: {
  items: ListItem[];
  onRemove: (id: string) => void;
  onReorder?: (from: number, to: number) => void;
}) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((it, idx) => (
        <li
          key={it.id}
          draggable={!!onReorder}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", String(idx));
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const from = Number(e.dataTransfer.getData("text/plain"));
            if (!Number.isNaN(from) && onReorder) onReorder(from, idx);
          }}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm"
        >
          {onReorder && <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />}
          <span className="flex-1 truncate">{it.name}</span>
          <span className="text-xs text-muted-foreground">
            {(it.size / 1024).toFixed(0)} KB
          </span>
          <button
            onClick={() => onRemove(it.id)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}