import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Edit3 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { AnyType } from "@/types/common";
import { mergeEmailPreviewVariables } from "@/lib/email-template-preview";
import { EmailHtmlPreview } from "@/components/EmailHtmlPreview";
import { Loader } from "./ui/loader";

interface EmailTemplateEditorProps {
  slug: string;
  variables?: Record<string, string>;
  onContentChange: (content: string) => void;
  initialContent?: string;
}

export function EmailTemplateEditor({
  slug,
  variables = {},
  onContentChange,
  initialContent,
}: EmailTemplateEditorProps) {
  const [content, setContent] = useState(initialContent || "");
  const [loading, setLoading] = useState(!initialContent);
  const [activeTab, setActiveTab] = useState("edit");
  const [templateData, setTemplateData] = useState<AnyType>(null);

  useEffect(() => {
    // If initial content provided (e.g. from previous edit), use it.
    // Otherwise fetch from backend.
    if (initialContent) return;

    const fetchTemplate = async () => {
      try {
        setLoading(true);
        // Fetch template from backend using the API client
        const template = await api.emails.getTemplate(slug);
        setTemplateData(template);
        const fetchedContent = template.htmlContent;
        setContent(fetchedContent);
        onContentChange(fetchedContent);
      } catch (error) {
        toast({
          title: "Failed to load template",
          description: "Could not fetch email template. Using default empty.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [slug]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onContentChange(e.target.value);
  };

  const renderPreview = () => {
    let previewHtml = content;
    const previewVariables = mergeEmailPreviewVariables(variables);
    Object.entries(previewVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      previewHtml = previewHtml.replace(regex, String(value));
    });

    // Simple handling for {{#if}} - simplistic regex replacement for common cases just for preview
    // Note: This is client-side preview approximation.
    previewHtml = previewHtml.replace(
      /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
      (match, key, block) => {
        return previewVariables[key] ? block : "";
      }
    );

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
            <TabsTrigger value="edit" className="text-xs">
              <Edit3 className="h-3 w-3 mr-2" />
              Edit HTML
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              <Eye className="h-3 w-3 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="edit" className="m-0 p-0">
          <Textarea
            value={content}
            onChange={handleTextChange}
            className="min-h-[300px] font-mono text-xs border-0 focus-visible:ring-0 rounded-none resize-y p-4"
            placeholder="<html>...</html>"
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0 p-0">
          <EmailHtmlPreview html={renderPreview()} />
          <div className="bg-yellow-50 p-2 text-xs text-yellow-800 hover:bg-yellow-800 hover:text-yellow-50 border-t border-yellow-100 text-center">
            Preview mode: Here you can see how your email will look like with
            example Name, Email, etc.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
