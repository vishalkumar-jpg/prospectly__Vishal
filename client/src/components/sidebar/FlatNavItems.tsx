import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { ACTIVE_BLUE, type NavItem } from "./nav-items";

interface FlatNavItemsProps {
  items: NavItem[];
  isActive: (url: string) => boolean;
  baseBtn: string;
  onItemClick?: () => void;
  showLabels: boolean;
}

export function FlatNavItems({
  items,
  isActive,
  baseBtn,
  onItemClick,
  showLabels,
}: FlatNavItemsProps) {
  return (
    <>
      {items.map((item) => (
        <SidebarMenuItem key={`${item.title}-${item.url}`}>
          <SidebarMenuButton
            asChild
            tooltip={item.title}
            className={cn(baseBtn, isActive(item.url) && ACTIVE_BLUE)}
            onClick={onItemClick}
          >
            <NavLink to={item.url}>
              <div className="w-6 flex justify-center">
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px]",
                    item.iconClassName ?? "text-foreground"
                  )}
                />
              </div>
              {showLabels ? (
                <span className="text-[14px] font-medium">{item.title}</span>
              ) : null}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
}
