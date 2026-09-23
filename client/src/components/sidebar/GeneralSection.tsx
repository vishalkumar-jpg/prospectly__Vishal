import { Settings, ChevronDown, ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { generalItems, ACTIVE_BLUE } from "./nav-items";

interface GeneralSectionProps {
  state: string;
  generalOpen: boolean;
  setGeneralOpen: (open: boolean) => void;
  generalHover: boolean;
  setGeneralHover: (hover: boolean) => void;
  isActive: (url: string) => boolean;
  baseBtn: string;
}

export function GeneralSection({
  state,
  generalOpen,
  setGeneralOpen,
  generalHover,
  setGeneralHover,
  isActive,
  baseBtn,
}: GeneralSectionProps) {
  return (
    <SidebarMenuItem>
      {state === "collapsed" ? (
        <Popover open={generalHover} onOpenChange={setGeneralHover}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              className={baseBtn}
              onMouseEnter={() => setGeneralHover(true)}
              onMouseLeave={() => setGeneralHover(false)}
            >
              <div className="w-6 flex justify-center">
                <Settings className="h-[18px] w-[18px] text-cyan-500" />
              </div>
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="center"
            sideOffset={0}
            className="w-56 p-0 space-y-0 shadow-lg border-2"
            onMouseEnter={() => setGeneralHover(true)}
            onMouseLeave={() => setGeneralHover(false)}
          >
            <div className="px-4 py-3 border-b bg-muted/5">
              <p className="font-bold text-[14px] text-foreground">General</p>
            </div>
            <div className="p-2 space-y-1">
              {generalItems.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px]",
                    isActive(item.url)
                      ? ACTIVE_BLUE
                      : "hover:bg-brand-amethyst/10 dark:hover:bg-brand-amethyst/15"
                  )}
                >
                  <div className="w-6 flex justify-center">
                    <item.icon className="h-[18px] w-[18px] text-cyan-500" />
                  </div>
                  {item.title}
                </NavLink>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <>
          <SidebarMenuButton
            onClick={() => setGeneralOpen(!generalOpen)}
            className={cn(baseBtn, "justify-between")}
          >
            <span className="flex items-center gap-3">
              <div className="w-6 flex justify-center">
                <Settings className="h-[18px] w-[18px] text-cyan-500" />
              </div>
              General
            </span>
            {generalOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </SidebarMenuButton>

          {generalOpen && (
            <SidebarGroupContent className="mt-2 pl-8 space-y-1.5">
              {generalItems.map((item) => (
                <SidebarMenuButton
                  key={item.title}
                  asChild
                  className={cn(baseBtn, isActive(item.url) && ACTIVE_BLUE)}
                >
                  <NavLink to={item.url}>
                    <div className="w-6 flex justify-center">
                      <item.icon className="h-[18px] w-[18px] text-cyan-500" />
                    </div>
                    {item.title}
                  </NavLink>
                </SidebarMenuButton>
              ))}
            </SidebarGroupContent>
          )}
        </>
      )}
    </SidebarMenuItem>
  );
}
