import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InlineAssetSvgProps = {
  svg: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "dangerouslySetInnerHTML" | "children">;

export function InlineAssetSvg({ svg, className, ...rest }: InlineAssetSvgProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
      {...rest}
    />
  );
}
