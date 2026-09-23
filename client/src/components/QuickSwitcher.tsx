import { useEffect, useState, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Home, Users, Target, Briefcase, Settings } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface NavigationItem {
  title: string;
  url: string;
  icon: ElementType;
  group: string;
}

const navigationItems: NavigationItem[] = [
  // Dashboard
  { title: "Dashboard", url: "/dashboard", icon: Home, group: "Main" },

  {
    title: "Import Contacts",
    url: "/getting-started",
    icon: Users,
    group: "Getting Started",
  },

  // Prospecting
  {
    title: "Find Prospects",
    url: "/prospecting/find-prospects",
    icon: Target,
    group: "Prospecting",
  },
  {
    title: "My Prospects",
    url: "/prospecting/my-prospects",
    icon: Briefcase,
    group: "Prospecting",
  },
  {
    title: "Incoming Requests",
    url: "/prospecting/incoming-requests",
    icon: Briefcase,
    group: "Prospecting",
  },
  {
    title: "Opportunities",
    url: "/prospecting/opportunities",
    icon: Target,
    group: "Prospecting",
  },

  // General
  {
    title: "My Contacts",
    url: "/my-contacts",
    icon: Users,
    group: "General",
  },

  // Account
  {
    title: "Profile Settings",
    url: "/profile-settings",
    icon: Settings,
    group: "Account",
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: Briefcase,
    group: "Account",
  },
  {
    title: "Help & Support",
    url: "/contact",
    icon: Settings,
    group: "Account",
  },
];

export function QuickSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  const groupedItems = navigationItems.reduce(
    (acc, item) => {
      if (!acc[item.group]) {
        acc[item.group] = [];
      }
      acc[item.group].push(item);
      return acc;
    },
    {} as Record<string, NavigationItem[]>
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {Object.entries(groupedItems).map(([group, items], index) => (
          <div key={group}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.url}
                  onSelect={() => handleSelect(item.url)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
