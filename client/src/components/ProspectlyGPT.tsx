import { useState, useRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import {
  Bot,
  Send,
  Sparkles,
  Brain,
  Target,
  Users,
  DollarSign,
  Mail,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle,
  X,
  Edit3,
  Globe,
  Building,
  type LucideIcon,
} from "lucide-react";
import { AnyType } from "@/types/common";
import { toUTC } from "@/lib/dayjs";

interface GPTMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  quickActions?: QuickAction[];
}

interface QuickAction {
  label: string;
  icon: LucideIcon;
  action: string;
  description: string;
  color?: string;
}

interface ProspectlyGPTProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImplementPlan?: (suggestions: AnyType) => void;
}

const ProspectlyGPT = ({
  isOpen,
  onOpenChange,
  onImplementPlan,
}: ProspectlyGPTProps) => {
  const [messages, setMessages] = useState<GPTMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check if we need API key for real AI responses
    if (!apiKey) {
      setShowApiKeyInput(true);
    }
  }, [apiKey]);

  useEffect(() => {
    // Initialize with contextual welcome message based on current page
    const contextualMessage = getContextualWelcomeMessage();
    setMessages([contextualMessage]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const callPerplexityAPI = async (message: string): Promise<string> => {
    if (!apiKey) {
      return "Please enter your Perplexity API key to get real AI responses.";
    }

    try {
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-sonar-small-128k-online",
            messages: [
              {
                role: "system",
                content:
                  "You are a sales prospecting expert. Provide specific, actionable advice for campaign optimization, lead generation, and outreach strategies. Be concise but detailed.",
              },
              {
                role: "user",
                content: message,
              },
            ],
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 1000,
            return_images: false,
            return_related_questions: false,
            frequency_penalty: 1,
            presence_penalty: 0,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const data = await response.json();
      return (
        data.choices[0]?.message?.content ||
        "I couldn't generate a response. Please try again."
      );
    } catch {
      return "There was an error connecting to the AI service. Please check your API key and try again.";
    }
  };

  const extractCampaignSuggestions = (aiResponse: string) => {
    // Extract actionable suggestions from AI response
    const suggestions: AnyType = {};

    // Look for bounty amounts
    const bountyMatch = aiResponse.match(/\$(\d+)/g);
    if (bountyMatch) {
      suggestions.bountyAmount = bountyMatch[0].replace("$", "");
    }

    // Look for campaign name suggestions
    if (
      aiResponse.toLowerCase().includes("campaign name") ||
      aiResponse.toLowerCase().includes("call it")
    ) {
      const nameMatch = aiResponse.match(/"([^"]+)"/g);
      if (nameMatch) {
        suggestions.campaignName = nameMatch[0].replace(/"/g, "");
      }
    }

    // Look for prospect list recommendations
    if (
      aiResponse.toLowerCase().includes("tech vp") ||
      aiResponse.toLowerCase().includes("vp")
    ) {
      suggestions.prospectList = "1"; // Tech VPs Q4 2024 list
    }

    // Look for email suggestions
    if (
      aiResponse.toLowerCase().includes("email") ||
      aiResponse.toLowerCase().includes("subject")
    ) {
      suggestions.emailScript = aiResponse;
    }

    // Look for channel recommendations - enhanced detection
    if (
      aiResponse.toLowerCase().includes("linkedin") &&
      aiResponse.toLowerCase().includes("email")
    ) {
      suggestions.channels = { linkedin: true, email: true };
    } else if (aiResponse.toLowerCase().includes("linkedin")) {
      suggestions.channels = { linkedin: true, email: false };
    } else if (aiResponse.toLowerCase().includes("email")) {
      suggestions.channels = { email: true, linkedin: false };
    }

    // Look for timing suggestions
    const dayMatch = aiResponse.match(/(\d+)\s*day/gi);
    if (dayMatch) {
      suggestions.sequenceDelay = dayMatch[0].match(/\d+/)[0];
    }

    return suggestions;
  };

  const getContextualWelcomeMessage = (): GPTMessage => {
    const path = location.pathname;

    if (path.includes("/profile")) {
      return {
        id: "1",
        role: "assistant",
        content:
          "🎯 Profile Enhancement Assistant! I can research and auto-fill your profile sections using real-time web data. I'll gather company information, industry insights, professional background, and generate compelling value propositions. Ready to create an outstanding profile?",
        timestamp: toUTC(),
        quickActions: [
          {
            label: "Research & Fill Profile",
            icon: Sparkles,
            action: "research_profile",
            description: "Auto-fill all profile sections with AI research",
          },
          {
            label: "Enhance Bio",
            icon: Edit3,
            action: "enhance_bio",
            description: "Create compelling professional bio",
          },
          {
            label: "Generate Value Prop",
            icon: Target,
            action: "generate_value_prop",
            description: "Create unique selling proposition",
          },
          {
            label: "Company Research",
            icon: Building,
            action: "company_research",
            description: "Research company details and industry",
          },
        ],
      };
    } else if (path.includes("/campaigns/create")) {
      return {
        id: "1",
        role: "assistant",
        content:
          "🚀 Welcome to Campaign Creation! I'm here to help you build a high-converting campaign. I can suggest optimal payout amounts, recommend the best outreach channels, generate compelling scripts, and provide real-time optimization tips. Let's create something amazing together!",
        timestamp: toUTC(),
        quickActions: [
          {
            label: "Suggest Payout Amount",
            icon: DollarSign,
            action: "suggest_bounty",
            description: "Get AI-powered payout recommendations",
          },
          {
            label: "Generate Email Script",
            icon: Mail,
            action: "generate_email_script",
            description: "Create personalized email templates",
          },
          {
            label: "Channel Strategy",
            icon: Target,
            action: "channel_strategy",
            description: "Optimize your outreach channels",
          },
          {
            label: "Timing Optimization",
            icon: Clock,
            action: "timing_optimization",
            description: "Perfect your sequence timing",
          },
        ],
      };
    } else if (path.includes("/campaigns")) {
      return {
        id: "1",
        role: "assistant",
        content:
          "Hi! I'm Prospectly GPT 🚀 I see you're working on campaigns. I can help you optimize your outreach strategy, generate compelling scripts, set competitive payouts, and analyze performance. What would you like to work on?",
        timestamp: toUTC(),
        quickActions: [
          {
            label: "Create Campaign",
            icon: Target,
            action: "create_campaign",
            description: "Get AI assistance for campaign setup",
          },
          {
            label: "Optimize Scripts",
            icon: Mail,
            action: "optimize_scripts",
            description: "Improve your email templates",
          },
          {
            label: "Analyze Performance",
            icon: BarChart3,
            action: "analyze_performance",
            description: "Review campaign metrics",
          },
          {
            label: "Set Payouts",
            icon: DollarSign,
            action: "set_bounties",
            description: "Get competitive payout recommendations",
          },
        ],
      };
    } else if (path.includes("/dashboard")) {
      return {
        id: "1",
        role: "assistant",
        content:
          "Welcome to Prospectly GPT! 👋 I'm your AI assistant for sales prospecting and warm introductions. I can help you with campaigns, lead generation, payout optimization, and more. How can I assist you today?",
        timestamp: toUTC(),
        quickActions: [
          {
            label: "Get Started",
            icon: Sparkles,
            action: "get_started",
            description: "Learn the basics of Prospectly",
            color: "text-blue-500",
          },
          {
            label: "Find Prospects",
            icon: Users,
            action: "find_prospects",
            description: "Discover high-quality leads",
            color: "text-green-500",
          },
          {
            label: "Setup Campaign",
            icon: Target,
            action: "setup_campaign",
            description: "Create your first campaign",
            color: "text-purple-500",
          },
          {
            label: "Best Practices",
            icon: TrendingUp,
            action: "best_practices",
            description: "Learn proven strategies",
            color: "text-orange-500",
          },
        ],
      };
    } else {
      return {
        id: "1",
        role: "assistant",
        content:
          "Hello! I'm Prospectly GPT, your AI-powered sales assistant. I can help you with lead generation, campaign optimization, script writing, reward strategies, and more. What can I help you with?",
        timestamp: toUTC(),
        quickActions: [
          {
            label: "Platform Overview",
            icon: HelpCircle,
            action: "platform_overview",
            description: "Learn about Prospectly features",
          },
          {
            label: "Sales Strategy",
            icon: Target,
            action: "sales_strategy",
            description: "Get strategic advice",
          },
          {
            label: "Lead Generation",
            icon: Users,
            action: "lead_generation",
            description: "Find and qualify prospects",
          },
          {
            label: "Best Practices",
            icon: CheckCircle,
            action: "best_practices",
            description: "Learn proven strategies",
          },
        ],
      };
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: GPTMessage = {
      id: toUTC().valueOf().toString(),
      role: "user",
      content: newMessage,
      timestamp: toUTC(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentMessage = newMessage;
    setNewMessage("");
    setIsTyping(true);

    try {
      // Use real Perplexity API if available, otherwise fallback
      const aiContent = apiKey
        ? await callPerplexityAPI(currentMessage)
        : generateGPTResponse(currentMessage).content;

      const aiResponse: GPTMessage = {
        id: toUTC().valueOf().toString(),
        role: "assistant",
        content: aiContent,
        timestamp: toUTC(),
        quickActions: apiKey
          ? [
              {
                label: "Implement Plan",
                icon: CheckCircle,
                action: "implement_plan",
                description: "Apply AI suggestions to campaign",
              },
            ]
          : [],
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch {
      const errorResponse: GPTMessage = {
        id: toUTC().valueOf().toString(),
        role: "assistant",
        content:
          "I encountered an error processing your request. Please try again.",
        timestamp: toUTC(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (action === "implement_plan") {
      // Extract suggestions from the most recent AI message
      const lastAIMessage = messages
        .filter((m) => m.role === "assistant")
        .pop();
      if (lastAIMessage && onImplementPlan) {
        const suggestions = extractCampaignSuggestions(lastAIMessage.content);
        onImplementPlan(suggestions);
        toast({
          title: "AI Plan Implemented",
          description: "Campaign suggestions have been applied to your form.",
        });
      }
      return;
    }

    setIsTyping(true);

    if (apiKey) {
      // Use real Perplexity API for quick actions too
      const actionPrompt = getActionPrompt(action);
      try {
        const aiContent = await callPerplexityAPI(actionPrompt);
        const response: GPTMessage = {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content: aiContent,
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Implement Plan",
              icon: CheckCircle,
              action: "implement_plan",
              description: "Apply AI suggestions to campaign",
            },
          ],
        };
        setMessages((prev) => [...prev, response]);
      } catch {
        toast({
          title: "AI service unavailable",
          description:
            "Couldn't reach the AI service. Showing a pre-generated response instead.",
          variant: "destructive",
        });
        const fallbackResponse = generateActionResponse(action);
        setMessages((prev) => [...prev, fallbackResponse]);
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = generateActionResponse(action);
      setMessages((prev) => [...prev, response]);
    }

    setIsTyping(false);
  };

  const getActionPrompt = (action: string): string => {
    switch (action) {
      case "research_profile":
        return "Research and provide comprehensive profile information for a professional. Include company details, industry insights, role responsibilities, and suggest professional bio content. Format as structured data for profile auto-fill.";
      case "enhance_bio":
        return "Create a compelling professional bio for a business professional. Include achievements, expertise, and value proposition. Keep it concise but impactful.";
      case "generate_value_prop":
        return "Generate a unique selling proposition for a professional or company. Include specific benefits, differentiators, and target market focus.";
      case "company_research":
        return "Research company information including industry, size, revenue range, market position, and recent developments. Provide structured business data.";
      case "suggest_bounty":
        return "Suggest optimal payout amounts for VP-level prospects in tech companies. Include specific dollar amounts and reasoning.";
      case "generate_email_script":
        return "Create a high-converting cold email script for reaching VP prospects. Include subject line and full email body.";
      case "channel_strategy":
        return "Recommend the best outreach channel strategy for VP prospects. Include timing and sequence recommendations.";
      case "timing_optimization":
        return "Provide optimal timing recommendations for VP prospect outreach including best days, times, and follow-up intervals.";
      default:
        return `Provide sales prospecting advice for: ${action}`;
    }
  };

  const generateActionResponse = (action: string): GPTMessage => {
    switch (action) {
      case "research_profile":
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            '🔍 **Profile Research Complete!** Here\'s what I found:\n\n**Professional Background:**\n• Senior leadership role in technology/SaaS sector\n• 8+ years experience in business development\n• Proven track record in scaling enterprise solutions\n\n**Company Insights:**\n• Growing SaaS company in CRM/sales automation space\n• Target market: Mid-market to enterprise B2B (500-5000 employees)\n• Revenue range: $10M-$50M annually\n• Key differentiator: AI-powered automation with 40% faster sales cycles\n\n**Suggested Bio:**\n"Results-driven technology executive with 8+ years scaling enterprise SaaS solutions. Led CRM implementations for 200+ companies, driving 85% average revenue increase. Certified Salesforce Partner with 99% client retention. Speaker at 15+ industry conferences including SaaStr and Sales Hacker."\n\n**Value Proposition:**\n"We deliver 40% faster sales cycles through AI-powered lead qualification and automated follow-up sequences, backed by 24/7 customer success support."\n\nReady to apply these suggestions to your profile?',
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Apply All Changes",
              icon: CheckCircle,
              action: "apply_profile_changes",
              description: "Auto-fill profile with research data",
            },
            {
              label: "Customize Bio",
              icon: Edit3,
              action: "customize_bio",
              description: "Edit the suggested bio",
            },
            {
              label: "Research More",
              icon: Globe,
              action: "deep_research",
              description: "Get additional company insights",
            },
          ],
        };

      case "enhance_bio":
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            '✨ **Enhanced Professional Bio:**\n\n"Results-driven technology executive with 8+ years of experience scaling enterprise CRM and sales automation solutions. Led successful implementations for 200+ companies, achieving an average 85% revenue increase within the first year.\n\nKey achievements:\n• Certified Salesforce Partner with 99% client retention rate\n• Speaker at 15+ industry conferences (SaaStr, Sales Hacker)\n• Expertise in AI-powered lead qualification and sales process optimization\n• Proven track record in mid-market to enterprise B2B sectors\n\nSpecializes in helping growing companies (500-5000 employees) accelerate their sales cycles by 40% through strategic automation and customer success excellence."\n\n**Why this works**: Quantified achievements, industry credibility, specific expertise, and clear value proposition.',
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Use This Bio",
              icon: CheckCircle,
              action: "apply_bio",
              description: "Apply to profile bio section",
            },
            {
              label: "Make It Shorter",
              icon: Edit3,
              action: "shorten_bio",
              description: "Create concise version",
            },
            {
              label: "Industry Focus",
              icon: Target,
              action: "industry_bio",
              description: "Tailor for specific industry",
            },
          ],
        };

      case "generate_value_prop":
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            '🎯 **Unique Selling Proposition Options:**\n\n**Option 1 (Results-focused):**\n"We deliver 40% faster sales cycles through AI-powered lead qualification and automated follow-up sequences, backed by 24/7 customer success support."\n\n**Option 2 (Process-focused):**\n"Transform your sales operations with enterprise CRM solutions that eliminate manual tasks, qualify leads automatically, and accelerate deal closure by 6 weeks on average."\n\n**Option 3 (Market-focused):**\n"The only CRM partner that guarantees 85% revenue growth for mid-market SaaS companies, with proven implementations across 200+ organizations and 99% client retention."\n\n**Recommendation**: Option 1 combines specific metrics (40% faster) with clear benefits and support promise.',
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Use Option 1",
              icon: CheckCircle,
              action: "apply_value_prop_1",
              description: "Apply results-focused USP",
            },
            {
              label: "Combine Options",
              icon: Edit3,
              action: "combine_value_props",
              description: "Create hybrid version",
            },
            {
              label: "Custom USP",
              icon: Target,
              action: "custom_value_prop",
              description: "Generate custom variation",
            },
          ],
        };

      case "company_research":
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            "🏢 **Company Research Results:**\n\n**Industry Analysis:**\n• SaaS/CRM Software (High growth sector)\n• Market size: $63.9B globally, growing 14% annually\n• Key trends: AI integration, automation, customer success focus\n\n**Company Profile:**\n• Size: 51-200 employees (Mid-market SaaS)\n• Revenue: $10M-$50M (Based on industry benchmarks)\n• Years in business: 8+ years (Established player)\n• Geographic focus: North America & Europe\n\n**Market Position:**\n• Competing with Salesforce, HubSpot, Pipedrive\n• Differentiator: AI-powered automation\n• Target customers: Growing B2B companies (500-5000 employees)\n• Minimum deal size: $50k+ (Enterprise focus)\n\n**Recent Trends:**\n• Increased demand for sales automation\n• Focus on customer success and retention\n• AI/ML integration becoming standard",
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Update Company Info",
              icon: CheckCircle,
              action: "apply_company_data",
              description: "Fill company profile sections",
            },
            {
              label: "Competitor Analysis",
              icon: BarChart3,
              action: "competitor_analysis",
              description: "Research competitive landscape",
            },
            {
              label: "Market Insights",
              icon: TrendingUp,
              action: "market_insights",
              description: "Get industry-specific data",
            },
          ],
        };

      case "suggest_bounty":
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            "Based on your prospect list analysis, here are my payout recommendations:\n\n💰 **For Tech VPs**: $450-550 (competitive range)\n📊 **Market Data**: Average VP payout in tech is $425\n🎯 **My Recommendation**: Set at $500 for faster responses\n\n**Why this works**: Your prospects are high-value decision makers. A premium payout (top 20% of market) ensures quality introductions and quick responses. ROI typically 8-12x for qualified meetings.",
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Set $500 Payout",
              icon: CheckCircle,
              action: "set_bounty_500",
              description: "Apply recommended amount",
            },
            {
              label: "See ROI Calculator",
              icon: BarChart3,
              action: "roi_calculator",
              description: "Calculate expected returns",
            },
          ],
        };

      case "generate_email_script":
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            "Here's a high-converting email script tailored for your VP prospects:\n\n**Subject**: Quick question about [Company]'s Q4 growth plans\n\n**Body**:\nHi [FirstName],\n\nI noticed [Company] recently [specific trigger - funding/hiring/product launch]. Impressive momentum!\n\nI've helped 3 similar companies in [industry] increase their sales pipeline by 40%+ through strategic introductions. Given your growth trajectory, you might find value in connecting with [specific type of prospect].\n\nWorth a 10-minute conversation? I can share some insights specific to your market.\n\nBest,\n[Your name]\n\n**Why this works**: Personalized, value-first, low commitment ask.",
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Customize Script",
              icon: Edit3,
              action: "customize_script",
              description: "Personalize for your prospects",
            },
            {
              label: "A/B Test Version",
              icon: TrendingUp,
              action: "ab_test_script",
              description: "Create alternative version",
            },
          ],
        };

      case "channel_strategy":
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            "📊 **Optimal Channel Strategy for VP Prospects:**\n\n🥇 **Email + LinkedIn** (Recommended)\n• Email: 22% response rate\n• LinkedIn follow-up: +35% response boost\n• Total expected: 28-30% response rate\n\n⏰ **Sequence Timing:**\n• Day 1: Email\n• Day 4: LinkedIn connection + note\n• Day 8: LinkedIn message\n• Day 12: Final email\n\n📞 **Phone calls**: Add after LinkedIn engagement for warm prospects\n\n**Pro Tip**: VPs prefer professional, multi-touch sequences over single-channel blasts.",
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Apply Strategy",
              icon: CheckCircle,
              action: "apply_channel_strategy",
              description: "Set up recommended channels",
            },
            {
              label: "Custom Sequence",
              icon: Settings,
              action: "custom_sequence",
              description: "Build custom timing",
            },
          ],
        };

      case "timing_optimization":
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            "⏰ **Perfect Timing for VP Outreach:**\n\n📅 **Best Days**: Tuesday-Thursday\n🕐 **Best Times**: 8-10 AM or 2-4 PM (their timezone)\n📊 **Follow-up Intervals**: 3-4 days (optimal for executives)\n\n**Sequence Optimization:**\n• Touch 1: Tuesday 9 AM (Email)\n• Touch 2: Friday 3 PM (LinkedIn)\n• Touch 3: Tuesday 10 AM (LinkedIn message)\n• Touch 4: Thursday 2 PM (Final email)\n\n**Why this works**: Aligns with executive schedules and decision-making patterns. 67% higher open rates during these windows.",
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Set Schedule",
              icon: Clock,
              action: "set_schedule",
              description: "Apply optimal timing",
            },
            {
              label: "Timezone Optimizer",
              icon: Globe,
              action: "timezone_optimizer",
              description: "Adjust for prospect timezones",
            },
          ],
        };

      case "create_campaign":
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            "Great! Let's create an optimized campaign. Here's my step-by-step recommendation:\n\n1. **Start with Warm Introductions** - They have 85% higher success rates\n2. **Set competitive payouts** - I recommend $400-500 for VP-level prospects\n3. **Use value-first messaging** - Focus on insights, not sales pitches\n4. **Optimize timing** - 3-4 day intervals work best for senior prospects\n\nWould you like me to help you with any specific aspect?",
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Script Templates",
              icon: Mail,
              action: "script_templates",
              description: "Get proven email templates",
            },
            {
              label: "Payout Calculator",
              icon: DollarSign,
              action: "bounty_calculator",
              description: "Calculate optimal payout amounts",
            },
            {
              label: "Timing Strategy",
              icon: Clock,
              action: "timing_strategy",
              description: "Optimize sequence timing",
            },
          ],
        };

      case "optimize_scripts":
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            "Here are my top email optimization tips:\n\n📧 **Subject Lines**: Keep under 50 characters, use personalization\n🎯 **Opening**: Reference something specific about their company\n💡 **Value Prop**: Lead with insight or social proof\n📞 **CTA**: Make it low-commitment (10-minute call)\n⚡ **Length**: 75-100 words for cold emails\n\nWant me to review your specific templates?",
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Review My Scripts",
              icon: Mail,
              action: "review_scripts",
              description: "Get feedback on your emails",
            },
            {
              label: "A/B Test Ideas",
              icon: BarChart3,
              action: "ab_test_ideas",
              description: "Test different approaches",
            },
          ],
        };

      case "set_bounties":
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            "Here's my payout strategy framework:\n\n💰 **VP Level**: $400-600 (based on industry)\n👨‍💼 **Director Level**: $250-400\n🏢 **Manager Level**: $150-250\n\n**Competitive Analysis**: Your payout should be top 20% in your market to ensure quick responses. I've analyzed 500+ similar campaigns.\n\n**Pro Tip**: Offer performance bonuses for meeting-to-close conversions!",
          timestamp: toUTC(),
          quickActions: [
            {
              label: "Market Analysis",
              icon: TrendingUp,
              action: "market_analysis",
              description: "See competitor payout data",
            },
            {
              label: "ROI Calculator",
              icon: BarChart3,
              action: "roi_calculator",
              description: "Calculate payout ROI",
            },
          ],
        };

      default:
        return {
          id: toUTC().valueOf().toString(),
          role: "assistant",
          content:
            "I'm here to help! Feel free to ask me about campaigns, lead generation, scripts, payouts, or any other sales prospecting topics.",
          timestamp: toUTC(),
        };
    }
  };

  const generateGPTResponse = (userInput: string): GPTMessage => {
    const input = userInput.toLowerCase();

    // Enhanced dummy responses with actionable data for testing guided implementation
    if (
      input.includes("campaign") ||
      input.includes("setup") ||
      input.includes("create") ||
      input.includes("optimize")
    ) {
      return {
        id: toUTC().valueOf().toString(),
        role: "assistant",
        content: `🚀 **Complete AI Campaign Optimization:**

📊 **Campaign Setup**:
• **Name**: "Q4 VP Tech Outreach" 
• **List**: Tech VPs Q4 2024 (247 contacts - best performing)
• **Payout**: $525 (23% above market rate for faster responses)
• **Channels**: Email + LinkedIn sequence (3.2x higher response rate)
• **Timing**: 3-day follow-up intervals (optimal for executives)

**Expected Performance**:
• Response Rate: 28-32%
• Meeting Rate: 15-18%
• Pipeline Value: $2.3M+ average
• ROI: 11.5x return on investment

**Why This Works**: This exact configuration generated $4.2M in pipeline for 12 similar campaigns last quarter.

Ready to implement this AI-optimized setup across all steps?`,
        timestamp: toUTC(),
        quickActions: [
          {
            label: "Implement Plan",
            icon: CheckCircle,
            action: "implement_plan",
            description: "Apply complete AI optimization",
          },
        ],
      };
    } else if (
      input.includes("bounty") ||
      input.includes("payout") ||
      input.includes("price") ||
      input.includes("cost")
    ) {
      return {
        id: toUTC().valueOf().toString(),
        role: "assistant",
        content: `💰 **Payout Optimization for VP Prospects:**

**Market Analysis**: Current VP payout rates:
• Industry Average: $425
• Top Performers: $500-600
• **My Recommendation**: $525

**Why $525 is optimal**:
• 23% premium = 2.1x faster response time
• ROI: Average deal $15,750 (30x return)
• Success rate: 94% respond within 48 hours
• Quality: Premium attracts serious connectors

**Performance Data**: Companies using $525 payouts see 157% higher conversion vs market rate.

Ready to set your payout at $525?`,
        timestamp: toUTC(),
        quickActions: [
          {
            label: "Implement Plan",
            icon: CheckCircle,
            action: "implement_plan",
            description: "Set $525 payout amount",
          },
        ],
      };
    } else if (
      input.includes("channel") ||
      input.includes("email") ||
      input.includes("linkedin")
    ) {
      return {
        id: toUTC().valueOf().toString(),
        role: "assistant",
        content: `📧 **Multi-Channel Strategy for VPs:**

**Recommended Sequence**:
1. **Email** (Day 1) - 22% open rate
2. **LinkedIn connection** (Day 3) - +35% response boost  
3. **LinkedIn message** (Day 7) - Personal touch
4. **Final email** (Day 12) - Last opportunity

**Channel Performance**:
• Email only: 18% response
• LinkedIn only: 15% response
• **Email + LinkedIn**: 28% response ⭐

**Timing**: 3-day intervals align with executive schedules (Tuesday/Thursday email, Wednesday/Friday LinkedIn).

Implement Email + LinkedIn with 3-day timing?`,
        timestamp: toUTC(),
        quickActions: [
          {
            label: "Implement Plan",
            icon: CheckCircle,
            action: "implement_plan",
            description: "Configure Email + LinkedIn sequence",
          },
        ],
      };
    } else if (
      input.includes("script") ||
      input.includes("template") ||
      input.includes("message")
    ) {
      return {
        id: toUTC().valueOf().toString(),
        role: "assistant",
        content: `✍️ **High-Converting VP Script (31% Response Rate):**

**Subject**: Quick question about [Company]'s Q4 scaling plans

**Body**:
Hi [FirstName],

I noticed [Company] just raised Series B - exciting momentum! 

I've helped 3 similar companies in [industry] add $2.3M+ to their pipeline through strategic VP introductions. Given your growth trajectory, I have someone perfect in mind.

Worth a 10-minute chat? I can share the specific intro and some Q4 scaling insights.

Best,
[Your name]

**Performance**: 31% response vs 18% industry average
**Why it works**: Personalized trigger + specific value + low commitment

Ready to implement this proven template?`,
        timestamp: toUTC(),
        quickActions: [
          {
            label: "Implement Plan",
            icon: CheckCircle,
            action: "implement_plan",
            description: "Use this script template",
          },
        ],
      };
    } else {
      return {
        id: toUTC().valueOf().toString(),
        role: "assistant",
        content: `🎯 **AI Campaign Assistant Ready!**

I can help optimize your campaign with data-driven recommendations:

💰 **Payout Optimization** - Market-tested amounts
📧 **Script Generation** - 31% response rate templates  
🎯 **Channel Strategy** - Multi-touch sequences
⏰ **Timing Optimization** - Executive-friendly schedules
📊 **Performance Prediction** - ROI forecasting

**Test the implementation**: Try asking me to "optimize my campaign" or "suggest a payout amount" to see the guided setup in action!

What would you like to optimize first?`,
        timestamp: toUTC(),
        quickActions: [
          {
            label: "Optimize Campaign",
            icon: Target,
            action: "campaign_help",
            description: "Complete AI optimization",
          },
          {
            label: "Suggest Payout",
            icon: DollarSign,
            action: "suggest_bounty",
            description: "Get payout recommendations",
          },
          {
            label: "Generate Script",
            icon: Mail,
            action: "script_writing",
            description: "Create email templates",
          },
        ],
      };
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[500px] bg-background border-l z-40 transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Prospectly GPT</h2>
          <Badge variant="secondary">
            <Brain className="h-3 w-3 mr-1" />
            AI Assistant
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-line">{message.content}</p>

                {/* Quick Actions */}
                {message.quickActions && (
                  <div className="mt-3 space-y-2">
                    {message.quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs h-auto p-2 bg-background hover:bg-muted"
                        onClick={() => handleQuickAction(action.action)}
                      >
                        <action.icon
                          className={`h-3 w-3 mr-2 ${action.color || ""}`}
                        />
                        <div className="text-left flex-1">
                          <div className="font-medium">{action.label}</div>
                          <div className="text-muted-foreground text-xs">
                            {action.description}
                          </div>
                        </div>
                        <ChevronRight className="h-3 w-3 ml-2" />
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <div
                    className="w-2 h-2 bg-primary rounded-full animate-pulse"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-primary rounded-full animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      <Separator />

      {/* API Key Input (if needed) */}
      {showApiKeyInput && !apiKey && (
        <div className="p-4 bg-muted/50 border-t">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Enter Perplexity API Key</p>
            </div>
            <p className="text-xs text-muted-foreground">
              For real AI responses, enter your Perplexity API key. Otherwise,
              you'll get simulated responses.
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="pplx-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={() => {
                  setShowApiKeyInput(false);
                  if (apiKey) {
                    toast({
                      title: "API Key Set",
                      description: "Real AI responses are now enabled!",
                    });
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-6 pt-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ask about campaigns, scripts, leads, payouts..."
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isTyping}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggested Questions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-6"
            onClick={() => setNewMessage("How do I optimize my email scripts?")}
          >
            Email Scripts
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-6"
            onClick={() => setNewMessage("What payout should I set?")}
          >
            Payout Help
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-6"
            onClick={() => setNewMessage("Find prospects in tech")}
          >
            Find Leads
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProspectlyGPT;
