import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { RICH_TEXT_CLASS, toEditorHtml } from "@/lib/rich-text";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  className?: string;
}

const STARTER_KIT = StarterKit.configure({
  heading: false,
  blockquote: false,
  codeBlock: false,
  horizontalRule: false,
  code: false,
});

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  id,
  ariaInvalid,
  ariaDescribedBy,
  className,
}: RichTextEditorProps) {
  // Latest prop value, read inside onUpdate to avoid echoing the initial /
  // programmatic content back to the parent (which would trigger live
  // validation on an untouched field).
  const valueRef = useRef(value);
  valueRef.current = value;

  const editor = useEditor({
    extensions: [
      STARTER_KIT,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: toEditorHtml(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[150px] w-full px-3 py-2 focus:outline-none",
          RICH_TEXT_CLASS
        ),
        ...(id ? { id } : {}),
        ...(ariaInvalid ? { "aria-invalid": "true" } : {}),
        ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      // Only propagate genuine changes — skip updates that just reproduce the
      // current value (initial render, programmatic setContent).
      if (html !== valueRef.current) {
        onChange(html);
      }
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  // Sync external value changes (AI generate, extraction, reset) without
  // clobbering the cursor during normal typing.
  useEffect(() => {
    if (!editor) return;
    const incoming = toEditorHtml(value) || "<p></p>";
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0",
        ariaInvalid
          ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/30"
          : "focus-within:border-brand-amethyst/40 focus-within:ring-brand-amethyst/20",
        disabled && "pointer-events-none opacity-60",
        className
      )}
    >
      {!disabled && editor && (
        <div className="flex items-center gap-0.5 border-b border-input px-1.5 py-1">
          <ToolbarButton
            icon={Bold}
            label="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            icon={Italic}
            label="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton
            icon={List}
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
        </div>
      )}
      <EditorContent editor={editor as Editor} />
    </div>
  );
}

interface ToolbarButtonProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-brand-amethyst/10 text-brand-amethyst"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
