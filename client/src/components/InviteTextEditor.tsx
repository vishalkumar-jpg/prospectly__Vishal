import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Edit3 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { mergeEmailPreviewVariables } from "@/lib/email-template-preview";
import { EmailHtmlPreview } from "@/components/EmailHtmlPreview";
import { Loader } from "./ui/loader";

// Default invite text that will be pre-filled
const DEFAULT_INVITE_TEXT = `I hope this message finds you well. I wanted to personally invite you to join Prospectly, a professional networking platform designed to connect like-minded professionals and foster meaningful business relationships.

Prospectly offers a unique opportunity to expand your professional network, discover new collaboration opportunities, and connect with industry leaders who share your vision. Our platform facilitates introductions, helps you build valuable connections, and opens doors to potential partnerships that can drive your career or business forward.

I believe you would be a valuable addition to our community, and I'm excited about the potential for us to collaborate and grow together. I look forward to welcoming you to Prospectly and seeing the connections you'll make.`;

interface InviteTextEditorProps {
  slug: string;
  variables?: Record<string, string>;
  onInviteTextChange: (inviteText: string) => void;
  defaultInviteText?: string;
}

export function InviteTextEditor({
  slug,
  variables = {},
  onInviteTextChange,
  defaultInviteText,
}: InviteTextEditorProps) {
  // Use provided defaultInviteText or fall back to DEFAULT_INVITE_TEXT
  const effectiveDefault =
    defaultInviteText !== undefined ? defaultInviteText : DEFAULT_INVITE_TEXT;
  const [inviteText, setInviteText] = useState(effectiveDefault);
  const [templateHtml, setTemplateHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("edit");

  useEffect(() => {
    // Reset invite text to default when component mounts or default changes
    const effectiveDefault =
      defaultInviteText !== undefined ? defaultInviteText : DEFAULT_INVITE_TEXT;
    setInviteText(effectiveDefault);
    onInviteTextChange(effectiveDefault);
  }, [defaultInviteText, onInviteTextChange]);

  useEffect(() => {
    // Fetch template from backend
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const template = await api.emails.getTemplate(slug);
        setTemplateHtml(template.htmlContent);
      } catch (error) {
        toast({
          title: "Failed to load template",
          description: "Could not fetch email template.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [slug]);

  const handleInviteTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newText = e.target.value;
    setInviteText(newText);
    onInviteTextChange(newText);
  };

  const renderPreview = () => {
    let previewHtml = templateHtml;
    const previewVariables = mergeEmailPreviewVariables(variables);

    Object.entries(previewVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      previewHtml = previewHtml.replace(regex, String(value));
    });

    // Replace inviteText with current value
    const inviteTextValue = inviteText || "";
    previewHtml = previewHtml.replace(/{{\s*inviteText\s*}}/g, inviteTextValue);

    // Handle {{#if inviteText}} blocks
    if (inviteTextValue.trim()) {
      previewHtml = previewHtml.replace(
        /{{#if\s+inviteText}}([\s\S]*?){{\/if}}/g,
        (match, block) => {
          // Replace inviteText variable inside the block
          return block.replace(/{{\s*inviteText\s*}}/g, inviteTextValue);
        }
      );
    } else {
      // Remove the entire block if inviteText is empty
      previewHtml = previewHtml.replace(
        /{{#if\s+inviteText}}[\s\S]*?{{\/if}}/g,
        ""
      );
    }

    // Remove any remaining template syntax for preview
    previewHtml = previewHtml.replace(/{{[^}]*}}/g, "");

    return previewHtml;
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader />
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-muted/50 border-b px-4 py-2 flex items-center justify-between">
          <h3 className="font-medium text-sm">Email Editor</h3>
          <TabsList className="h-8">
            <TabsTrigger
              value="edit"
              className={cn(
                "text-xs data-[state=active]:bg-brand-gradient data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm"
              )}
            >
              <Edit3 className="h-3 w-3 mr-2" />
              Edit Invite Text
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className={cn(
                "text-xs data-[state=active]:bg-brand-gradient data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm"
              )}
            >
              <Eye className="h-3 w-3 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="edit" className="m-0 p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Invite Message
            </label>
            <p className="text-xs text-muted-foreground">
              Customize the personal message that will be included in the
              invitation email. This message will only be used for this
              invitation and won't be saved.
            </p>
            <Textarea
              value={inviteText}
              onChange={handleInviteTextChange}
              className="min-h-[200px] max-h-[400px] resize-y"
              placeholder="Enter your personal invitation message here..."
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            <strong>Note:</strong> The email template structure cannot be
            modified. Only the invite message above can be customized for this
            invitation.
          </div>
        </TabsContent>

        <TabsContent value="preview" className="m-0 p-0">
          <EmailHtmlPreview html={renderPreview()} maxHeight={400} />
          <div className="bg-yellow-50 p-2 text-xs text-yellow-800 hover:bg-yellow-800 hover:text-yellow-50 border-t border-yellow-100 text-center">
            Preview mode: Here you can see how your email will look like with
            example Name, Email, etc.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
