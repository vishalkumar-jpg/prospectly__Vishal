import { cn } from "@/lib/utils";

export const navInnerDefault =
  "mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 md:px-10";

/** Same horizontal frame as hero: max-width 1200px + gutters (matches homepage HTML). */
export const navInnerMarketing =
  "mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 md:px-10 max-[900px]:px-5";

export const authBtnClass =
  "h-auto rounded-[10px] px-[22px] py-2.5 text-[15px] font-semibold";

export const marketingDashboardClass = cn(
  authBtnClass,
  "home-brand-gradient border-0 font-bold text-white shadow-[0_2px_10px_hsl(var(--home-rose)/0.22)] hover:brightness-[1.03]"
);
