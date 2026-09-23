import type { ImportSource } from "@/hooks/use-claim-verification";
import { InlineAssetSvg } from "./inline-asset-svg";
import sourceApple from "./source-apple.svg?raw";
import sourceCsvDocument from "./source-csv-document.svg?raw";
import sourceGoogle from "./source-google.svg?raw";
import sourceLinkedin from "./source-linkedin.svg?raw";
import sourceMicrosoft from "./source-microsoft.svg?raw";

function wrapRaw(svg: string, className: string) {
  return <InlineAssetSvg svg={svg} className={className} aria-hidden />;
}

export const VERIFY_SOURCE_ICONS: Record<ImportSource, JSX.Element> = {
  linkedin: wrapRaw(sourceLinkedin, "h-4 w-4"),
  google: wrapRaw(sourceGoogle, "h-4 w-4"),
  microsoft: wrapRaw(sourceMicrosoft, "h-4 w-4"),
  apple: wrapRaw(sourceApple, "h-4 w-4"),
  csv: wrapRaw(sourceCsvDocument, "h-4 w-4"),
};
