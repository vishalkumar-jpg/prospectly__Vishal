import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Download, UserPlus } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  source: string;
  avatar?: string;
  isDuplicate?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

interface ImportedContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  contacts: Contact[];
  sessionSource: string;
}

export function ImportedContactsModal({
  isOpen,
  onClose,
  sessionId,
  contacts,
  sessionSource,
}: ImportedContactsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.company &&
        contact.company.toLowerCase().includes(searchTerm.toLowerCase()));

    switch (selectedTab) {
      case "duplicates":
        return matchesSearch && contact.isDuplicate;
      case "errors":
        return matchesSearch && contact.isError;
      case "success":
        return matchesSearch && !contact.isDuplicate && !contact.isError;
      default:
        return matchesSearch;
    }
  });

  const stats = {
    total: contacts.length,
    success: contacts.filter((c) => !c.isDuplicate && !c.isError).length,
    duplicates: contacts.filter((c) => c.isDuplicate).length,
    errors: contacts.filter((c) => c.isError).length,
  };

  const getContactStatusBadge = (contact: Contact) => {
    if (contact.isError) {
      return <Badge variant="destructive">Error</Badge>;
    }
    if (contact.isDuplicate) {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Duplicate
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-800 hover:text-green-100 hover:bg-green-100">
        Imported
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Imported Contacts - {sessionSource}</DialogTitle>
          <DialogDescription>
            Review contacts imported from your {sessionSource} account
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="success">
              Imported ({stats.success})
            </TabsTrigger>
            <TabsTrigger value="duplicates">
              Duplicates ({stats.duplicates})
            </TabsTrigger>
            <TabsTrigger value="errors">Errors ({stats.errors})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={contact.avatar}
                            alt={contact.name}
                          />
                          <AvatarFallback className="text-xs">
                            {contact.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {contact.name}
                          </div>
                          {contact.title && (
                            <div className="text-xs text-muted-foreground">
                              {contact.title}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{contact.email}</div>
                      {contact.isError && contact.errorMessage && (
                        <div className="text-xs text-red-600">
                          {contact.errorMessage}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{contact.company || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{contact.phone || "-"}</div>
                    </TableCell>
                    <TableCell>{getContactStatusBadge(contact)}</TableCell>
                    <TableCell>
                      {!contact.isError && (
                        <Button variant="outline" size="sm">
                          <UserPlus className="h-3 w-3 mr-1" />
                          Invite
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredContacts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No contacts found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {filteredContacts.length} of {stats.total} contacts
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button>Add to Contacts</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
