import { type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (items: T[]) => void;
  /** Render a row. `dragHandle` must be placed somewhere inside to enable drag. */
  renderItem: (item: T, dragHandle: ReactNode, index: number) => ReactNode;
  className?: string;
  disabled?: boolean;
}

function SortableRow<T>({
  id,
  item,
  index,
  renderItem,
  disabled,
}: {
  id: string;
  item: T;
  index: number;
  renderItem: SortableListProps<T>["renderItem"];
  disabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  const dragHandle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      className={cn(
        "flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        disabled && "cursor-not-allowed opacity-40"
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {renderItem(item, dragHandle, index)}
    </div>
  );
}

/**
 * Accessible drag-to-reorder list. Persists nothing itself — call `onReorder`
 * with the new order and store it (e.g. as an integer `orderIndex`).
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  className,
  disabled,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => getId(i) === active.id);
    const newIndex = items.findIndex((i) => getId(i) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(getId)}
        strategy={verticalListSortingStrategy}
      >
        <div className={cn("space-y-3", className)}>
          {items.map((item, index) => (
            <SortableRow
              key={getId(item)}
              id={getId(item)}
              item={item}
              index={index}
              renderItem={renderItem}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
