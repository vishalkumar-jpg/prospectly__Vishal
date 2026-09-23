import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Star,
  AlertCircle,
  Loader2,
  CreditCard,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isPrimary: boolean;
  isExpired: boolean;
}

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onSetPrimary: (id: string) => void;
  onRemove: (id: string) => void;
  isProcessing: boolean;
}

const getBrandGradient = (brand: string) => {
  const brandLower = brand?.toLowerCase() || "";
  switch (brandLower) {
    case "visa":
      return "from-blue-600 via-blue-700 to-blue-800";
    case "mastercard":
      return "from-orange-500 via-red-500 to-red-600";
    case "amex":
      return "from-green-600 via-teal-600 to-cyan-700";
    case "discover":
      return "from-orange-600 via-amber-600 to-yellow-600";
    default:
      return "from-gray-600 via-gray-700 to-gray-800";
  }
};

export function PaymentMethodCard({
  method,
  onSetPrimary,
  onRemove,
  isProcessing,
}: PaymentMethodCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-none shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 w-full lg:max-w-[280px]",
        method.isPrimary && "ring-2 ring-amber-500 ring-offset-1"
      )}
    >
      {/* Compact Card Design */}
      <div
        className={cn(
          "relative aspect-[1.586/1] bg-gradient-to-br text-white p-4 rounded-lg",
          getBrandGradient(method.brand)
        )}
      >
        {/* Subtle overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-16 h-16 bg-white rounded-full blur-2xl" />
          <div className="absolute bottom-0 right-0 w-12 h-12 bg-white rounded-full blur-xl" />
        </div>

        {/* Card Content */}
        <div className="relative h-full flex flex-col justify-between">
          {/* Top Row: Brand */}
          <div className="flex items-start justify-between">
            {method.isPrimary && (
              <Badge className="bg-amber-500/90 text-white border-white/30 text-[10px] px-1.5 py-0.5">
                <Star className="h-2.5 w-2.5 fill-white mr-1" />
                PRIMARY
              </Badge>
            )}
            <div
              className={cn(
                "flex items-center gap-1.5 ml-auto",
                method.isPrimary && ""
              )}
            >
              <CreditCard className="h-5 w-5 text-white/80" />
              <span className="text-xs font-bold uppercase tracking-wide">
                {method.brand}
              </span>
            </div>
          </div>

          {/* Middle: Card Number */}
          <div className="flex items-center gap-2 text-base font-mono tracking-wider">
            <span className="text-white/60">••••</span>
            <span className="text-white/60">••••</span>
            <span className="text-white/60">••••</span>
            <span className="font-bold">{method.last4}</span>
          </div>

          {/* Bottom Row: Expiry */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-white/60 uppercase tracking-wide">
                Expires
              </p>
              <p
                className={cn(
                  "text-xs font-semibold",
                  method.isExpired && "text-red-300"
                )}
              >
                {String(method.expMonth).padStart(2, "0")}/{method.expYear}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MoreVertical className="h-3.5 w-3.5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!method.isPrimary && (
                  <DropdownMenuItem onClick={() => onSetPrimary(method.id)}>
                    <Star className="h-4 w-4 mr-2" />
                    Set as Primary
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onRemove(method.id)}
                >
                  Remove Card
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Expired Warning */}
        {method.isExpired && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
              <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
              Expired
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
