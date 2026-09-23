import {
  Info,
  ClipboardCheck,
  ListChecks,
  Gift,
  type LucideIcon,
} from "lucide-react";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { richTextLength } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import type { JobFormData } from "../types";

interface LivePreviewDetailsProps {
  formData: JobFormData;
}

export function LivePreviewDetails({ formData }: LivePreviewDetailsProps) {
  const sections: {
    id: string;
    heading: string;
    icon: LucideIcon;
    content: string;
  }[] = [
    {
      id: "about",
      heading: "About the Role",
      icon: Info,
      content: formData.description,
    },
    {
      id: "requirements",
      heading: "Requirements",
      icon: ClipboardCheck,
      content: formData.requirements,
    },
    {
      id: "responsibilities",
      heading: "Responsibilities",
      icon: ListChecks,
      content: formData.responsibilities,
    },
    {
      id: "benefits",
      heading: "Benefits",
      icon: Gift,
      content: formData.benefits,
    },
  ].filter((s) => richTextLength(s.content) > 0);

  if (sections.length === 0) return null;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      {sections.map((s) => (
        <section
          key={s.id}
          className="border-b border-border p-7 last:border-b-0"
        >
          <div className="mb-3.5 flex items-center gap-3">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
              <s.icon className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-lg font-extrabold tracking-tight">
              {s.heading}
            </h2>
          </div>
          <RichTextContent value={s.content} className="max-w-[680px]" />
        </section>
      ))}
    </article>
  );
}
