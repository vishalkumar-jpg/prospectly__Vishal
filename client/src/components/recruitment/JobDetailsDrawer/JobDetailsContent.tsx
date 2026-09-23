import {
  Info,
  ClipboardCheck,
  ListChecks,
  Gift,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { richTextLength } from "@/lib/rich-text";
import type { JobDetailsDisplayData } from "../job-details-mappers";

interface JobDetailsContentProps {
  job: JobDetailsDisplayData;
}

const sectionIconWrapClassName = "bg-secondary text-muted-foreground";

export function JobDetailsContent({ job }: JobDetailsContentProps) {
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
      content: job.description ?? "",
    },
    {
      id: "requirements",
      heading: "Requirements",
      icon: ClipboardCheck,
      content: job.requirements ?? "",
    },
    {
      id: "responsibilities",
      heading: "Responsibilities",
      icon: ListChecks,
      content: job.responsibilities ?? "",
    },
    {
      id: "benefits",
      heading: "Benefits",
      icon: Gift,
      content: job.benefits ?? "",
    },
  ].filter((s) => richTextLength(s.content) > 0);

  if (sections.length === 0) return null;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      {sections.map((s) => (
        <section
          key={s.id}
          className="border-b border-border p-6 last:border-b-0 sm:p-7"
        >
          <div className="mb-3.5 flex items-center gap-3">
            <div
              className={cn(
                "grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl",
                sectionIconWrapClassName
              )}
            >
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
