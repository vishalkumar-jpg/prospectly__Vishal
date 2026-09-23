import { Target, ChevronRight } from "lucide-react";
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
import { prospectingItems, ACTIVE_BLUE } from "./nav-items";

interface ProspectingSectionProps {
  state: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isHovered: boolean;
  setIsHovered: (hover: boolean) => void;
  isActive: (url: string) => boolean;
  baseBtn: string;
  onItemClick?: () => void;
}

const ICON_COLOR = "text-foreground";
const CHILD_ICON_COLOR = "text-muted-foreground";

export function ProspectingSection({
  state,
  isOpen,
  setIsOpen,
  isHovered,
  setIsHovered,
  isActive,
  baseBtn,
  onItemClick,
}: ProspectingSectionProps) {
  // Calculate dynamic max height: itemsCount * 42 + headersHeight + 8px padding
  const dynamicMaxHeight = isOpen
    ? `${prospectingItems.length * 42 + 100 + 8}px`
    : "0px"; // 100px for headers and spacing

  return (
    <SidebarMenuItem>
      {state === "collapsed" ? (
        <Popover open={isHovered} onOpenChange={setIsHovered}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              className={baseBtn}
              aria-label="Prospecting"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="w-6 flex justify-center">
                <Target className={cn("h-[18px] w-[18px]", ICON_COLOR)} />
              </div>
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="center"
            sideOffset={0}
            className="w-56 p-0 space-y-1.5 shadow-lg border-2"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="px-4 py-3 border-b bg-muted/5">
              <p className="font-bold text-[14px] text-foreground">
                Prospecting
              </p>
            </div>
            <div className="p-2 space-y-1.5">
              {prospectingItems.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  onClick={onItemClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px]",
                    isActive(item.url)
                      ? ACTIVE_BLUE
                      : "hover:bg-brand-amethyst/10 dark:hover:bg-brand-amethyst/15"
                  )}
                >
                  <div className="w-6 flex justify-center">
                    <item.icon
                      className={cn("h-[18px] w-[18px]", CHILD_ICON_COLOR)}
                    />
                  </div>
                  <span className="text-[14px] font-medium">{item.title}</span>
                </NavLink>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <>
          <SidebarMenuButton
            onClick={() => setIsOpen(!isOpen)}
            className={cn(baseBtn, "justify-between")}
            aria-expanded={isOpen}
            aria-controls="prospecting-panel"
          >
            <span id="prospecting-header" className="flex items-center gap-3">
              <div className="w-6 flex justify-center">
                <Target className={cn("h-[18px] w-[18px]", ICON_COLOR)} />
              </div>
              <span className="text-[14px] font-medium">Prospecting</span>
            </span>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-300 ease-in-out",
                isOpen ? "rotate-90" : "rotate-0"
              )}
            />
          </SidebarMenuButton>

          <div
            id="prospecting-panel"
            role="region"
            aria-labelledby="prospecting-header"
            aria-hidden={!isOpen}
            {...(!isOpen && { inert: "true" })}
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              isOpen ? "opacity-100" : "opacity-0"
            )}
            style={{
              maxHeight: dynamicMaxHeight,
              willChange: isOpen ? "max-height, opacity" : "auto",
            }}
          >
            <SidebarGroupContent className="mt-1 pl-8 space-y-1.5 relative before:absolute before:left-[22px] before:top-0 before:bottom-0 before:w-[1px] before:bg-border">
              {prospectingItems.map((item, index) => (
                <SidebarMenuButton
                  key={item.title}
                  asChild
                  className={cn(baseBtn, isActive(item.url) && ACTIVE_BLUE)}
                  onClick={onItemClick}
                  style={{
                    animation: isOpen
                      ? `slide-in-fade 0.3s ease-out ${50 + index * 30}ms both`
                      : "none",
                    willChange: isOpen ? "opacity, transform" : "auto",
                  }}
                >
                  <NavLink to={item.url}>
                    <div className="w-6 flex justify-center">
                      <item.icon
                        className={cn("h-[18px] w-[18px]", CHILD_ICON_COLOR)}
                      />
                    </div>
                    <span className="text-[14px] font-medium">
                      {item.title}
                    </span>
                  </NavLink>
                </SidebarMenuButton>
              ))}
            </SidebarGroupContent>
          </div>
        </>
      )}
    </SidebarMenuItem>
  );
}
