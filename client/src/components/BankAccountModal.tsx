import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Building2,
  CreditCard,
  Trash2,
  Star,
  StarOff,
} from "lucide-react";
import { bankAccountSchema, validateForm } from "@/utils/validation";
import { toUTC } from "@/lib/dayjs";

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountType: "checking" | "savings";
  isDefault: boolean;
  isVerified: boolean;
}

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockBankAccounts: BankAccount[] = [
  {
    id: "1",
    name: "Primary Checking",
    bankName: "Chase Bank",
    accountNumber: "****1234",
    routingNumber: "****5678",
    accountType: "checking",
    isDefault: true,
    isVerified: true,
  },
  {
    id: "2",
    name: "Business Savings",
    bankName: "Wells Fargo",
    accountNumber: "****5678",
    routingNumber: "****9012",
    accountType: "savings",
    isDefault: false,
    isVerified: true,
  },
  {
    id: "3",
    name: "Secondary Checking",
    bankName: "Bank of America",
    accountNumber: "****9012",
    routingNumber: "****3456",
    accountType: "checking",
    isDefault: false,
    isVerified: false,
  },
];

export default function BankAccountModal({
  isOpen,
  onClose,
}: BankAccountModalProps) {
  const [bankAccounts, setBankAccounts] =
    useState<BankAccount[]>(mockBankAccounts);
  const [activeTab, setActiveTab] = useState<"list" | "add">("list");
  const [newAccount, setNewAccount] = useState({
    name: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    accountType: "checking" as "checking" | "savings",
  });

  const handleAddAccount = () => {
    // Validate form data using security schema
    const validation = validateForm(bankAccountSchema, newAccount);

    if (!validation.success) {
      // Use explicit type narrowing for TypeScript
      const failedValidation = validation as {
        success: false;
        errors: Record<string, string[]>;
      };
      const errorMessages = Object.values(failedValidation.errors).flat();
      const errorMessage = String(
        errorMessages[0] || "Please check your input and try again."
      );
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    const validatedData = validation.data;

    const account: BankAccount = {
      id: toUTC().valueOf().toString(),
      name: validatedData.name,
      bankName: validatedData.bankName,
      accountNumber: `****${validatedData.accountNumber.slice(-4)}`,
      routingNumber: `****${validatedData.routingNumber.slice(-4)}`,
      accountType: validatedData.accountType,
      isDefault: bankAccounts.length === 0,
      isVerified: false,
    };

    setBankAccounts([...bankAccounts, account]);
    setNewAccount({
      name: "",
      bankName: "",
      accountNumber: "",
      routingNumber: "",
      accountType: "checking",
    });
    setActiveTab("list");

    toast({
      title: "Account Added",
      description:
        "Bank account has been added successfully and encrypted. Verification may take 1-2 business days.",
    });
  };

  const handleSetDefault = (accountId: string) => {
    setBankAccounts((accounts) =>
      accounts.map((account) => ({
        ...account,
        isDefault: account.id === accountId,
      }))
    );

    toast({
      title: "Default Account Updated",
      description: "Default bank account has been changed.",
    });
  };

  const handleDeleteAccount = (accountId: string) => {
    const accountToDelete = bankAccounts.find((acc) => acc.id === accountId);
    if (accountToDelete?.isDefault && bankAccounts.length > 1) {
      toast({
        title: "Cannot Delete Default Account",
        description:
          "Please set another account as default before deleting this one.",
        variant: "destructive",
      });
      return;
    }

    setBankAccounts((accounts) =>
      accounts.filter((account) => account.id !== accountId)
    );

    toast({
      title: "Account Removed",
      description: "Bank account has been removed successfully.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Manage Bank Accounts</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "list" | "add")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">
                Bank Accounts ({bankAccounts.length})
              </TabsTrigger>
              <TabsTrigger value="add">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {bankAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No bank accounts added yet
                  </p>
                  <Button onClick={() => setActiveTab("add")} className="mt-4">
                    Add Your First Account
                  </Button>
                </div>
              ) : (
                bankAccounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{account.name}</h3>
                              {account.isDefault && (
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-700 hover:bg-green-700 hover:text-green-100"
                                >
                                  Default
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className={
                                  account.isVerified
                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-700 hover:text-blue-100"
                                    : "bg-yellow-100 text-yellow-700 hover:bg-yellow-700 hover:text-yellow-100"
                                }
                              >
                                {account.isVerified
                                  ? "Verified"
                                  : "Pending Verification"}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">
                              {account.bankName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {account.accountType === "checking"
                                ? "Checking"
                                : "Savings"}{" "}
                              • {account.accountNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Routing: {account.routingNumber}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(account.id)}
                            disabled={account.isDefault}
                          >
                            {account.isDefault ? (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAccount(account.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account-name">Account Nickname *</Label>
                    <Input
                      id="account-name"
                      placeholder="e.g., Primary Checking"
                      value={newAccount.name}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank-name">Bank Name *</Label>
                    <Input
                      id="bank-name"
                      placeholder="e.g., Chase Bank"
                      value={newAccount.bankName}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          bankName: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account-number">Account Number *</Label>
                    <Input
                      id="account-number"
                      type="password"
                      placeholder="Account number"
                      value={newAccount.accountNumber}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          accountNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="routing-number">Routing Number *</Label>
                    <Input
                      id="routing-number"
                      placeholder="9-digit routing number"
                      value={newAccount.routingNumber}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          routingNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="account-type">Account Type</Label>
                  <select
                    id="account-type"
                    value={newAccount.accountType}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        accountType: e.target.value as "checking" | "savings",
                      })
                    }
                    className="w-full p-2 border border-input rounded-md bg-background"
                  >
                    <option value="checking">Checking Account</option>
                    <option value="savings">Savings Account</option>
                  </select>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Account Verification</p>
                      <p className="text-muted-foreground">
                        We'll send small verification deposits (under $1) to
                        confirm your account. This process typically takes 1-2
                        business days.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setActiveTab("list")}>
                  Cancel
                </Button>
                <Button onClick={handleAddAccount}>Add Bank Account</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
