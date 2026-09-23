import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Download, Eye } from "lucide-react";
import { toUTC } from "@/lib/dayjs";

interface ImportSession {
  id: string;
  source: string;
  status: "importing" | "completed" | "failed" | "pending";
  progress: number;
  totalContacts: number;
  importedContacts: number;
  duplicatesFound: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

interface ImportProgressProps {
  sessions: ImportSession[];
  onViewContacts: (sessionId: string) => void;
  onDownloadReport: (sessionId: string) => void;
}

function tickImportSession({
  session,
}: {
  session: ImportSession;
}): ImportSession {
  const isImporting = session.status === "importing" && session.progress < 100;
  if (!isImporting) {
    return session;
  }
  const newProgress = Math.min(session.progress + Math.random() * 10, 100);
  const newImported = Math.floor((newProgress / 100) * session.totalContacts);
  return {
    ...session,
    progress: newProgress,
    importedContacts: newImported,
    status: newProgress >= 100 ? "completed" : "importing",
    endTime: newProgress >= 100 ? toUTC() : undefined,
  };
}

function mapImportSessionsTick({
  sessions,
}: {
  sessions: ImportSession[];
}): ImportSession[] {
  return sessions.map((session) => tickImportSession({ session }));
}

export function ImportProgress({
  sessions,
  onViewContacts,
  onDownloadReport,
}: ImportProgressProps) {
  const [liveSessions, setLiveSessions] = useState<ImportSession[]>(sessions);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSessions((prev) => mapImportSessionsTick({ sessions: prev }));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "importing":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-800 hover:text-green-100 hover:bg-green-100">
            Completed
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "importing":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-800 hover:text-blue-100 hover:bg-blue-100">
            Importing...
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || toUTC();
    const duration = Math.floor((endTime.getTime() - start.getTime()) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600)
      return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  if (liveSessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import History</CardTitle>
          <CardDescription>No imports started yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Connect an account or upload a file to start importing contacts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import Progress</CardTitle>
        <CardDescription>{liveSessions.length} import sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {liveSessions.map((session) => (
            <div key={session.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(session.status)}
                  <span className="font-medium text-sm">{session.source}</span>
                </div>
                {getStatusBadge(session.status)}
              </div>

              {session.status === "importing" && (
                <div className="space-y-2">
                  <Progress value={session.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {session.importedContacts} of {session.totalContacts}{" "}
                      contacts
                    </span>
                    <span>{Math.round(session.progress)}%</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Imported:</span>
                  <span className="ml-1 font-medium">
                    {session.importedContacts}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duplicates:</span>
                  <span className="ml-1 font-medium">
                    {session.duplicatesFound}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Errors:</span>
                  <span className="ml-1 font-medium text-red-600">
                    {session.errors}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-1 font-medium">
                    {formatDuration(session.startTime, session.endTime)}
                  </span>
                </div>
              </div>

              {session.status === "completed" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewContacts(session.id)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Contacts
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownloadReport(session.id)}
                    className="flex-1"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Report
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
