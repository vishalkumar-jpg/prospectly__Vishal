import {
  Camera,
  Save,
  User,
  Building,
  Target,
  Users,
  Globe,
  Shield,
  Crown,
  UserCheck,
  Search,
  Loader2,
  Award,
  Settings,
  Mail,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { ProfileAvatar } from "@/components/shared/ProfileAvatar";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useRouteTab } from "@/hooks/useRouteTab";
import {
  PROFILE_SECTION_TABS,
  PROFILE_SECTION_TO_SLUG,
  TAB_ROUTE_BASES,
} from "@/lib/tab-routes";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { toast as sonnerToast, useToast } from "@/hooks/use-toast";
import { toUTC } from "@/lib/dayjs";
import { useQuery } from "@tanstack/react-query";
import ProspectlyGPT from "@/components/ProspectlyGPT";
import { AddPaymentMethodModal } from "@/components/introduction/AddPaymentMethodModal";
import { TrustPointsDisplay } from "@/components/TrustPointsDisplay";
import { ProfilePhotoCropper } from "@/components/ProfilePhotoCropper";
import {
  ProfileInformation,
  type ProfileInformationHandle,
} from "@/components/profile/ProfileInformation";
import {
  BusinessProfile,
  type BusinessProfileHandle,
} from "@/components/profile/BusinessProfile";
import { SubscriptionPlans } from "@/components/profile/SubscriptionPlans";
import { CurrentSubscription } from "@/components/profile/CurrentSubscription";
import { profileInformationSchema } from "@/schemas/profile-information.schema";
import { businessProfileSchema } from "@/schemas/business-profile.schema";
import { useUserStats } from "@/hooks/useUserStats";
import { PrivacySectionContent } from "@/components/profile/privacy/PrivacySection";
import { AccountDangerZone } from "@/components/profile/AccountDangerZone";
import { ProfileEmailPreferencesSection } from "@/components/profile/ProfileEmailPreferencesSection";
import type { PrivacyData } from "@/components/profile/privacy/AddDialog";
import { useQueryClient } from "@tanstack/react-query";
import type { AnyType } from "@/types/common";
import { AnimatedCounter } from "@/components/ui/innovative/AnimatedCounter";

/** Vertical left-rail tab trigger (desktop) / horizontal scroll chip (mobile). */
const profileRailTriggerClassName =
  "relative w-auto shrink-0 justify-start gap-2.5 rounded-xl px-4 py-2.5 text-left text-[14px] font-medium text-sidebar-foreground transition-all hover:bg-blue-100/60 dark:hover:bg-blue-900/15 data-[state=active]:bg-brand-amethyst/10 data-[state=active]:text-brand-amethyst data-[state=active]:shadow-none lg:w-full before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-brand-gradient before:opacity-0 before:content-[''] data-[state=active]:before:opacity-100 max-lg:before:hidden";

const PROFILE_SECTIONS = [
  "profile",
  "business",
  "organizations",
  "privacy",
  "subscriptions",
  "settings",
  "preferences",
] as const;

type ProfileSection = (typeof PROFILE_SECTIONS)[number];

const VALIDATION_TAB_TO_SECTION: Record<string, ProfileSection> = {
  basic: "profile",
  business: "business",
};

const ProfileSettings = () => {
  const [searchParams] = useSearchParams();
  const [activeSection, handleSectionChange] = useRouteTab<ProfileSection>({
    basePath: TAB_ROUTE_BASES.profile,
    allowedTabs: PROFILE_SECTIONS,
    defaultTab: "profile",
    slugToTab: PROFILE_SECTION_TABS,
    tabToSlug: PROFILE_SECTION_TO_SLUG,
    paramName: "section",
  });
  const highlightField = searchParams.get("highlight");
  const { user, refreshUser } = useAuth();
  const {
    trustPoints,
    connections,
    introductions,
    activeBounties,
    loading: statsLoading,
  } = useUserStats();
  const [userProfile, setUserProfile] = useState(null);
  // Ref to store profile data immediately when fetched, available during render before state updates
  const userProfileRef = useRef<AnyType>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showGPT, setShowGPT] = useState(false);
  const [isHighlightActive, setIsHighlightActive] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  // Track Privacy Settings feature view
  useEffect(() => {
    if (activeSection === "privacy") {
      analytics.trackFeatureViewed({
        feature: "privacy_settings",
        route: "/profile",
        entryPoint: "direct",
      });
    }
  }, [activeSection]);

  // Privacy dialog state
  const [isPrivacyDialogOpen, setIsPrivacyDialogOpen] = useState(false);
  const [editingPrivacy, setEditingPrivacy] = useState<{
    id: string;
    data: PrivacyData;
  } | null>(null);
  const [deletingPrivacy, setDeletingPrivacy] = useState<{
    id: string;
    domain: string;
  } | null>(null);
  const [privacyPage, setPrivacyPage] = useState(1);
  const [privacyLimit, setPrivacyLimit] = useState(10);
  const [privacySearch, setPrivacySearch] = useState("");
  const queryClient = useQueryClient();

  // Profile photo upload state
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUploadTimestamp, setImageUploadTimestamp] = useState<number>(
    toUTC().valueOf()
  );
  const [isProfileDataLoading, setIsProfileDataLoading] = useState(true);
  const [businessProfileErrors, setBusinessProfileErrors] = useState<
    Record<string, string>
  >({});
  const [basicProfileErrors, setBasicProfileErrors] = useState<
    Record<string, string>
  >({});

  // Check subscription loading states for unified loader
  const { isLoading: isLoadingCurrentSubscription } = useQuery({
    queryKey: ["/api/subscriptions/current"],
    queryFn: async () => {
      return api.subscriptions.getCurrentSubscription();
    },
    enabled: activeSection === "subscriptions",
    staleTime: 5 * 60 * 1000,
  });

  const { isLoading: isLoadingSubscriptionPlans } = useQuery({
    queryKey: ["/api/subscriptions/plans"],
    queryFn: async () => {
      return api.subscriptions.getPlans();
    },
    enabled: activeSection === "subscriptions",
    staleTime: 5 * 60 * 1000,
  });

  const isSubscriptionsLoading =
    isLoadingCurrentSubscription || isLoadingSubscriptionPlans;

  const { data: userOrgs = [], isLoading: isOrgsLoading } = useQuery({
    queryKey: ["/api/profiles/me/organizations"],
    queryFn: async () => {
      return api.profiles.getOrganizations();
    },
    enabled: activeSection === "organizations",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInformationRef = useRef<ProfileInformationHandle | null>(null);
  const businessProfileRef = useRef<BusinessProfileHandle | null>(null);
  interface InitialProfile {
    products?: string;
    uniqueSellingProposition?: string;
    targetMarket?: string;
    companySize?: string;
    revenueRange?: string;
    keyCredentials?: string;
  }
  const initialProfileRef = useRef<InitialProfile | null>(null); // Track initial profile values to detect unsaved changes

  // Refs for scrolling to highlighted fields
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const linkedinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get("delete") === "1") {
      handleSectionChange("settings");
    }
  }, [searchParams, handleSectionChange]);

  const handleTabChange = (value: string) => {
    handleSectionChange(value as ProfileSection);
  };

  // Handle field highlighting
  useEffect(() => {
    if (highlightField) {
      setIsHighlightActive(true);

      // Show toast notification
      const fieldMessages: Record<
        string,
        { title: string; description: string }
      > = {
        email: {
          title: "📧 Verify Your Email",
          description: "Complete this field to earn +2 Trust Score points!",
        },
        phone: {
          title: "📱 Verify Your Phone",
          description: "Add your phone number to earn +2 Trust Score points!",
        },
        linkedin: {
          title: "💼 Connect LinkedIn",
          description: "Link your LinkedIn to earn +3 Trust Score points!",
        },
      };

      const message = fieldMessages[highlightField];
      if (message) {
        toast({
          title: message.title,
          description: message.description,
          duration: 5000,
        });
      }

      // Scroll to the highlighted field
      setTimeout(() => {
        const refs: Record<string, React.RefObject<HTMLInputElement>> = {
          email: emailInputRef,
          phone: phoneInputRef,
          linkedin: linkedinInputRef,
        };

        const ref = refs[highlightField];
        if (ref?.current) {
          ref.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 300);

      // Auto-clear highlight after 4 seconds
      const timer = setTimeout(() => {
        setIsHighlightActive(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [highlightField, toast]);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      setIsProfileDataLoading(true);
      try {
        // Use user from AuthContext as base data (already fetched on app load)
        // Fetch profile to get complete profile data including profilePhotoUrl conversion
        let profileData = user as AnyType;
        // Update ref immediately so it's available during render before state updates
        userProfileRef.current = profileData;
        try {
          const profileResponse = await api.profiles.get();
          if (profileResponse) {
            // Merge profile response with user data (profile response takes precedence)
            profileData = { ...user, ...profileResponse };
            // Update ref with merged data
            userProfileRef.current = profileData;
          }
        } catch {
          // Silent fail for profile details, use user data as fallback
        }

        // Set userProfile only after we have all data including profilePhotoUrl
        setUserProfile(profileData);

        // Update local profile state with fetched data
        setProfile((prev) => ({
          ...prev,
          // Basic info
          firstName: profileData.firstName || prev.firstName,
          lastName: profileData.lastName || prev.lastName,
          title: profileData.jobTitle || prev.title,
          company: profileData.company || prev.company,
          industry: profileData.industry || prev.industry,
          location: profileData.location || prev.location,
          country: profileData.country || prev.country,
          bio: profileData.bio || prev.bio,
          email: profileData.email || prev.email,
          phone: profileData.phone || prev.phone,
          linkedinUrl: profileData.linkedinUrl || prev.linkedinUrl,
          websiteUrl: profileData.websiteUrl || prev.websiteUrl,
          // Business info
          products: profileData.products || prev.products,
          uniqueSellingProposition:
            profileData.uniqueSellingProposition ||
            prev.uniqueSellingProposition,
          targetMarket: profileData.targetMarket || prev.targetMarket,
          companySize: profileData.companySize || prev.companySize,
          revenueRange: profileData.revenueRange || prev.revenueRange,
          keyCredentials: profileData.keyCredentials || prev.keyCredentials,
          // User configuration
          isUserUnsubscribe:
            profileData.userConfiguration?.isUserUnsubscribe ??
            prev.isUserUnsubscribe,
        }));

        // Only set loading to false after we've set the state and ref with profile data
        // This ensures ProfileAvatar doesn't show initials prematurely
        setIsProfileDataLoading(false);
      } catch {
        setIsProfileDataLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Memoized profile photo URL - recomputes when userProfile, ref, or timestamp changes
  // Use ref as fallback when state hasn't updated yet (available immediately during render)
  const profilePhotoUrl = useMemo(() => {
    const profileData = userProfile || userProfileRef.current;
    if (!profileData) {
      return null;
    }
    interface UserProfileWithPhoto {
      profilePhotoUrl?: string;
    }
    const photoUrl = (profileData as UserProfileWithPhoto)?.profilePhotoUrl;

    if (!photoUrl) {
      return null;
    }

    // Backend returns full URL, so use it directly
    // If it's a full URL (starts with http), return it with cache buster
    // Otherwise, it might be an S3 key that wasn't converted (fallback)
    if (typeof photoUrl === "string" && photoUrl.startsWith("http")) {
      // Add cache-busting timestamp to force browser to fetch new image after upload
      const separator = photoUrl.includes("?") ? "&" : "?";
      const finalUrl = `${photoUrl}${separator}t=${imageUploadTimestamp}`;
      return finalUrl;
    }

    // Fallback: if somehow we still have an S3 key, return null to use default avatar
    return null;
  }, [userProfile, imageUploadTimestamp]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const maxSize = 3 * 1024 * 1024; // 3MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    const allowedExtensions = [".jpg", ".jpeg", ".png"];

    // Validate file size
    if (file.size > maxSize) {
      sonnerToast.error("File too large", {
        description: "Please select an image smaller than 3MB",
      });
      return;
    }

    // Validate file type by extension
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      sonnerToast.error("Invalid file type", {
        description: "Please select a JPG, JPEG, or PNG image",
      });
      return;
    }

    // Validate MIME type
    if (!allowedTypes.includes(file.type)) {
      sonnerToast.error("Invalid file type", {
        description: "Please select a JPG, JPEG, or PNG image",
      });
      return;
    }

    // Create preview URL and open cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setSelectedImage(imageUrl);
      setIsCropperOpen(true);
    };
    reader.onerror = () => {
      sonnerToast.error("Error reading file", {
        description: "Could not read the selected image",
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle cropped image upload
  const handleCropComplete = async (croppedImageBlob: Blob) => {
    if (!user?.id) {
      sonnerToast.error("Error", {
        description: "User not found",
      });
      return;
    }

    setIsUploading(true);
    setIsCropperOpen(false);

    try {
      // Get user's name from userProfile or profile state
      const firstName =
        (userProfile as { firstName?: string })?.firstName ||
        profile.firstName ||
        "";
      const lastName =
        (userProfile as { lastName?: string })?.lastName ||
        profile.lastName ||
        "";

      // Upload to backend proxy endpoint (handles S3 upload server-side)
      const updatedProfile = await api.profiles.uploadPhoto(
        croppedImageBlob,
        firstName,
        lastName
      );

      // Update user profile with response
      if (updatedProfile) {
        setUserProfile((prev: typeof updatedProfile | null) => {
          const merged = prev ? { ...prev, ...updatedProfile } : updatedProfile;
          // Update ref to keep it in sync
          userProfileRef.current = merged;
          return merged;
        });
        // Update timestamp to bust cache and force new image fetch
        setImageUploadTimestamp(toUTC().valueOf());

        // Refresh user data in AuthContext to update profile badge in DashboardLayout
        try {
          await refreshUser();
        } catch (error) {
          sonnerToast.error(
            "Profile photo updated, but failed to refresh. Please reload the page."
          );
        }
      }

      sonnerToast.success("Profile photo updated!", {
        description: "Your profile photo has been successfully uploaded",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload profile photo. Please try again.";
      sonnerToast.error("Upload failed", {
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
      setSelectedImage(null);
    }
  };

  const [profile, setProfile] = useState({
    // Basic Info - these will be populated from LinkedIn
    firstName: "",
    lastName: "",
    title: "",
    company: "",
    industry: "",
    location: "",
    country: "",
    bio: "",
    linkedinId: "", // Store LinkedIn ID but don't display

    // Business Info - keep hardcoded values since LinkedIn doesn't provide these
    products: "",
    uniqueSellingProposition: "",
    targetMarket: "",
    companySize: "",
    revenueRange: "",
    yearsInBusiness: "",
    keyCredentials: "",
    geographicFocus: ["North America", "Europe"],
    minimumDealSize: "$50k",
    responseTimeCommitment: "Within 24 hours",
    meetingPreferences: ["Video calls", "In-person meetings", "Phone calls"],

    // Privacy
    newPrivacyDomain: "",
    privacyReason: "direct_competitor",
    privacyBlocking: {
      hideProfile: false,
      hideBounties: false,
      blockOutreach: false,
      excludeFromSearch: false,
    },
    privacyBlocks: [] as Array<{
      domain: string;
      reason: string;
      dateAdded: string;
      hideProfile: boolean;
      hideBounties: boolean;
      blockOutreach: boolean;
      excludeFromSearch: boolean;
    }>,

    // Professional Organizations
    professionalOrganizations: [
      {
        id: 1,
        name: "Young Presidents' Organization (YPO)",
        type: "Executive Group",
        membershipLevel: "Member",
        startDate: "2022-01",
        endDate: "",
        verificationStatus: "verified",
        verificationMethod: "email",
        website: "",
        profileUrl: "",
      },
      {
        id: 2,
        name: "Sales Management Association",
        type: "Industry Association",
        membershipLevel: "Board Member",
        startDate: "2020-03",
        endDate: "",
        verificationStatus: "verified",
        verificationMethod: "document",
        website: "",
        profileUrl: "",
      },
      {
        id: 3,
        name: "Stanford Alumni Association",
        type: "Alumni",
        membershipLevel: "Member",
        startDate: "2010-06",
        endDate: "",
        verificationStatus: "verified",
        verificationMethod: "email",
        website: "",
        profileUrl: "",
      },
    ],

    // Contact Info - email and linkedinUrl from LinkedIn, others hardcoded
    email: "",
    phone: "",
    linkedinUrl: "",
    websiteUrl: "",

    // Networking Goals - keep hardcoded since LinkedIn doesn't provide these
    lookingFor: [
      "Enterprise software buyers ($1M+ ARR companies)",
      "SaaS founders seeking enterprise partnerships",
      "HR tech decision makers",
    ],
    canOffer: [
      "Introductions to Fortune 500 IT executives",
      "SaaS industry insights and best practices",
      "Sales process optimization consulting",
    ],

    // Privacy Settings
    showEmail: false,
    showPhone: false,
    showEarnings: true,
    allowDirectMessages: true,
    profileVisibility: "public",

    // Meeting Setup
    meetingPlatform: "",
    meetingUrl: "",
    defaultMeetingDuration: "30min",
    meetingAvailability: "Weekdays 9 AM - 5 PM EST",
    autoCcOnIntros: true,

    // Subscription Email Preferences
    isUserUnsubscribe: false,
  });

  const [defaultOrgs, setDefaultOrgs] = useState([
    {
      id: "vistage",
      name: "Vistage",
      type: "Executive Group",
      selected: false,
      website: "",
      profileUrl: "",
      membershipLevel: "",
      startDate: "",
    },
    {
      id: "bni",
      name: "BNI",
      type: "Networking Group",
      selected: false,
      website: "",
      profileUrl: "",
      membershipLevel: "",
      startDate: "",
    },
    {
      id: "eo",
      name: "Entrepreneurs Organization",
      type: "Executive Group",
      selected: false,
      website: "",
      profileUrl: "",
      membershipLevel: "",
      startDate: "",
    },
  ]);

  // Validate update payload before sending to API
  // This works regardless of which tab is active since it validates the actual payload data
  interface UpdateData {
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    company?: string;
    industry?: string;
    location?: string;
    country?: string;
    bio?: string;
    phone?: string;
    linkedinUrl?: string;
    websiteUrl?: string;
    products?: string;
    uniqueSellingProposition?: string;
    targetMarket?: string;
    companySize?: string;
    revenueRange?: string;
    keyCredentials?: string;
    isUserUnsubscribe?: boolean;
  }
  const validateUpdatePayload = (
    updateData: UpdateData
  ): {
    isValid: boolean;
    errors: {
      basic?: Record<string, string>;
      business?: Record<string, string>;
    };
    errorTab?: string;
  } => {
    const basicFields = [
      "firstName",
      "lastName",
      "jobTitle",
      "company",
      "industry",
      "location",
      "country",
      "bio",
      "phone",
      "linkedinUrl",
      "websiteUrl",
    ];
    const businessFields = [
      "products",
      "uniqueSellingProposition",
      "targetMarket",
      "companySize",
      "revenueRange",
      "keyCredentials",
    ];

    // Extract basic profile data
    const basicData: Record<string, string> = {};
    basicFields.forEach((field) => {
      if (updateData[field as keyof UpdateData] !== undefined) {
        basicData[field] = updateData[field as keyof UpdateData] as string;
      }
    });

    // Extract business profile data
    const businessData: Record<string, string> = {};
    businessFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        businessData[field] = updateData[field];
      }
    });

    const errors: {
      basic?: Record<string, string>;
      business?: Record<string, string>;
    } = {};
    let errorTab: string | undefined;

    // Validate basic profile fields
    if (Object.keys(basicData).length > 0) {
      // Ensure required fields are present for validation
      const basicDataForValidation = {
        firstName: basicData.firstName || "",
        lastName: basicData.lastName || "",
        jobTitle: basicData.jobTitle || "",
        company: basicData.company || "",
        industry: basicData.industry || "",
        location: basicData.location || "",
        country: basicData.country || "",
        bio: basicData.bio || "",
        phone: basicData.phone || "",
        linkedinUrl: basicData.linkedinUrl || "",
        websiteUrl: basicData.websiteUrl || "",
      };

      const basicResult = profileInformationSchema.safeParse(
        basicDataForValidation
      );

      if (!basicResult.success) {
        const basicErrors: Record<string, string> = {};
        basicResult.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          if (field && !basicErrors[field]) {
            basicErrors[field] = issue.message;
          }
        });
        errors.basic = basicErrors;
        if (!errorTab) errorTab = "basic";
      }
    }

    // Validate business profile fields
    if (Object.keys(businessData).length > 0) {
      const businessDataForValidation = {
        products: businessData.products || "",
        uniqueSellingProposition: businessData.uniqueSellingProposition || "",
        targetMarket: businessData.targetMarket || "",
        companySize: businessData.companySize || "",
        revenueRange: businessData.revenueRange || "",
        keyCredentials: businessData.keyCredentials || "",
      };

      const businessResult = businessProfileSchema.safeParse(
        businessDataForValidation
      );

      if (!businessResult.success) {
        const businessErrors: Record<string, string> = {};
        businessResult.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          if (field && !businessErrors[field]) {
            businessErrors[field] = issue.message;
          }
        });
        errors.business = businessErrors;
        if (!errorTab) errorTab = "business";
      }
    }

    const isValid = Object.keys(errors).length === 0;

    return { isValid, errors, errorTab };
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get form values from both components (if available)
      const basicFormValues = profileInformationRef.current?.getFormValues();
      const businessFormValues = businessProfileRef.current?.getFormValues();

      // Helper function to get value for optional fields: send empty string if cleared, undefined if not provided
      const getOptionalFieldValue = (
        formValue: string | undefined,
        stateValue: string | undefined
      ): string | undefined => {
        // Prefer form value if it exists (even if empty string), otherwise use state value
        const value = formValue !== undefined ? formValue : stateValue;
        if (value === undefined) return undefined;
        const trimmed = value.trim();
        // If field exists but is empty, send empty string to clear it on backend
        // If field has value, send trimmed value
        return trimmed === "" ? "" : trimmed;
      };

      // Helper function specifically for Business Profile fields
      // When businessFormValues exists, use those values directly (they're already current state from component)
      // Only fall back to profile state if ref is not available
      const getBusinessProfileValue = (
        fieldName:
          | "products"
          | "uniqueSellingProposition"
          | "targetMarket"
          | "companySize"
          | "revenueRange"
          | "keyCredentials"
      ): string | undefined => {
        if (businessFormValues) {
          // Ref is available, use the value directly (including empty strings to clear fields)
          const value = businessFormValues[fieldName];
          if (value === undefined) return undefined;
          const trimmed = value.trim();
          return trimmed === "" ? "" : trimmed;
        }
        // Ref not available, fall back to parent state
        const profileValue = profile[fieldName] as string | undefined;
        return getOptionalFieldValue(undefined, profileValue);
      };

      const updateData: UpdateData = {
        // Basic info: prefer current form values if available, otherwise fall back to local state
        firstName:
          basicFormValues?.firstName?.trim() ||
          profile.firstName?.trim() ||
          undefined,
        lastName:
          basicFormValues?.lastName?.trim() ||
          profile.lastName?.trim() ||
          undefined,
        // Optional fields: send empty string if cleared, undefined if not provided
        company: getOptionalFieldValue(
          basicFormValues?.company,
          profile.company
        ),
        jobTitle: getOptionalFieldValue(
          basicFormValues?.jobTitle,
          profile.title
        ),
        location: getOptionalFieldValue(
          basicFormValues?.location,
          profile.location
        ),
        country:
          basicFormValues?.country?.trim() ||
          profile.country?.trim() ||
          undefined,
        industry: getOptionalFieldValue(
          basicFormValues?.industry,
          profile.industry
        ),
        bio: getOptionalFieldValue(basicFormValues?.bio, profile.bio),
        linkedinUrl: getOptionalFieldValue(
          basicFormValues?.linkedinUrl,
          profile.linkedinUrl
        ),
        phone: getOptionalFieldValue(basicFormValues?.phone, profile.phone),
        websiteUrl: getOptionalFieldValue(
          basicFormValues?.websiteUrl,
          profile.websiteUrl
        ),
        // Business profile fields: use ref values directly when available, otherwise fall back to parent state
        products: getBusinessProfileValue("products"),
        uniqueSellingProposition: getBusinessProfileValue(
          "uniqueSellingProposition"
        ),
        targetMarket: getBusinessProfileValue("targetMarket"),
        companySize: getBusinessProfileValue("companySize"),
        revenueRange: getBusinessProfileValue("revenueRange"),
        keyCredentials: getBusinessProfileValue("keyCredentials"),

        // Subscription preferences
        isUserUnsubscribe:
          basicFormValues?.isUserUnsubscribe ?? profile.isUserUnsubscribe,
      };

      // Only remove undefined values (not empty strings)
      // Empty strings are sent explicitly to clear optional fields on the backend
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Validate payload before sending to API
      const validationResult = validateUpdatePayload(updateData);
      if (!validationResult.isValid) {
        setIsLoading(false);

        // Set errors before switching tabs to ensure they persist
        if (validationResult.errors.basic) {
          setBasicProfileErrors(validationResult.errors.basic);
        }
        if (validationResult.errors.business) {
          setBusinessProfileErrors(validationResult.errors.business);
        }

        // Switch to appropriate section based on which section has errors
        if (validationResult.errorTab) {
          const section =
            VALIDATION_TAB_TO_SECTION[validationResult.errorTab] || "profile";
          handleSectionChange(section);
        }

        // Trigger validation in the appropriate component to show errors
        // Use setTimeout to ensure errors are set after tab switch completes
        setTimeout(() => {
          if (validationResult.errors.basic && profileInformationRef.current) {
            profileInformationRef.current.validateForm();
          }
          if (validationResult.errors.business && businessProfileRef.current) {
            businessProfileRef.current.validateForm(
              validationResult.errors.business
            );
          }
        }, 100);

        return;
      }

      const updatedProfile = await api.profiles.update(updateData);

      // Clear validation errors on successful save
      setBasicProfileErrors({});
      setBusinessProfileErrors({});

      toast({
        title: "Profile Saved",
        description: "Your profile has been updated successfully.",
        duration: 3000,
      });

      // Refresh the profile data
      userProfileRef.current = updatedProfile;
      setUserProfile(updatedProfile);

      // Country lives on the AuthContext user too, which the completion gate
      // reads; without this it keeps the pre-save value until a reload.
      await refreshUser();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile with data from database
  // Only update Business Profile fields that haven't been modified locally to preserve unsaved changes
  useEffect(() => {
    if (userProfile || user) {
      setProfile((prev) => {
        const updated: typeof prev = {
          ...prev,
          // Basic info - from backend (camelCase field names)
          firstName:
            userProfile?.firstName ||
            user?.fullName?.split(" ")[0] ||
            prev.firstName,
          lastName:
            userProfile?.lastName ||
            user?.fullName?.split(" ").slice(1).join(" ") ||
            prev.lastName,
          email: userProfile?.email || user?.email || prev.email,
          company: userProfile?.company || prev.company,
          title: userProfile?.jobTitle || prev.title,
          location: userProfile?.location || prev.location,
          country: userProfile?.country || prev.country,
          bio: userProfile?.bio || prev.bio,
          linkedinUrl: userProfile?.linkedinUrl || prev.linkedinUrl,
          industry:
            userProfile?.industry && userProfile.industry.trim() !== ""
              ? userProfile.industry
              : "",
          phone: userProfile?.phone || prev.phone,
          websiteUrl: userProfile?.websiteUrl || prev.websiteUrl,
          isUserUnsubscribe:
            userProfile?.userConfiguration?.isUserUnsubscribe ??
            prev.isUserUnsubscribe,
        };

        // For Business Profile fields, preserve unsaved changes by only updating from userProfile if:
        // 1. This is the initial load (initialProfileRef is null), OR
        // 2. The current local value matches the initial value (meaning it hasn't been modified)
        const isInitialLoad = initialProfileRef.current === null;
        const businessFields = [
          "products",
          "uniqueSellingProposition",
          "targetMarket",
          "companySize",
          "revenueRange",
          "keyCredentials",
        ] as const;

        // Helper to normalize values for comparison: treat empty string and undefined as equivalent
        const normalizeForComparison = (
          value: string | undefined | null
        ): string | undefined => {
          if (value === null || value === undefined || value === "")
            return undefined;
          return value;
        };

        // Helper to get the actual value to use (preserve empty string if user cleared it)
        const getValueToUse = (
          userProfileValue: string | undefined,
          currentValue: string | undefined,
          shouldPreserveCurrent: boolean
        ): string | undefined => {
          // If we should preserve current (user modified it), always use current value
          if (shouldPreserveCurrent) {
            return currentValue;
          }
          // Otherwise, use userProfileValue if available, otherwise keep current
          if (userProfileValue !== undefined && userProfileValue !== null) {
            return userProfileValue === "" ? "" : userProfileValue;
          }
          // Preserve current value (which might be empty string)
          return currentValue;
        };

        businessFields.forEach((field) => {
          interface UserProfileWithBusinessFields {
            products?: string;
            uniqueSellingProposition?: string;
            targetMarket?: string;
            companySize?: string;
            revenueRange?: string;
            keyCredentials?: string;
          }
          const userProfileValue = (
            userProfile as UserProfileWithBusinessFields
          )?.[field];
          const currentValue = prev[field];
          const initialValue = initialProfileRef.current?.[field];

          if (isInitialLoad) {
            // Initial load: use value from userProfile or keep current
            // Preserve empty strings explicitly
            updated[field] = getValueToUse(
              userProfileValue,
              currentValue,
              false
            );
          } else {
            // Subsequent updates: only update if current value matches initial value
            // (meaning it hasn't been modified by the user)
            // Use normalized comparison to handle empty string vs undefined
            const normalizedCurrent = normalizeForComparison(currentValue);
            const normalizedInitial = normalizeForComparison(initialValue);
            const valuesMatch = normalizedCurrent === normalizedInitial;

            if (valuesMatch) {
              // Values match (or both are empty/undefined), safe to update from userProfile
              updated[field] = getValueToUse(
                userProfileValue,
                currentValue,
                false
              );
            } else {
              // Preserve the user's unsaved changes (including empty strings)
              // This includes when user explicitly cleared a field ("" vs undefined)
              updated[field] = currentValue;
            }
          }
        });

        // Store initial values on first load
        if (isInitialLoad) {
          initialProfileRef.current = {
            products: updated.products,
            uniqueSellingProposition: updated.uniqueSellingProposition,
            targetMarket: updated.targetMarket,
            companySize: updated.companySize,
            revenueRange: updated.revenueRange,
            keyCredentials: updated.keyCredentials,
          };
        } else {
          // Update initial ref when userProfile has new values that we're using
          // (this happens after a save, making the saved values the new baseline)
          // Only update if we're not preserving local changes (meaning values came from userProfile)
          // Use normalized comparison to handle empty string vs undefined
          const normalizeForComparison = (
            value: string | undefined | null
          ): string | undefined => {
            if (value === null || value === undefined || value === "")
              return undefined;
            return value;
          };

          const allFieldsMatchInitial = businessFields.every((field) => {
            const currentValue = prev[field];
            const initialValue = initialProfileRef.current?.[field];
            const normalizedCurrent = normalizeForComparison(currentValue);
            const normalizedInitial = normalizeForComparison(initialValue);
            return normalizedCurrent === normalizedInitial;
          });

          // If all fields match initial (no local changes preserved), update baseline from userProfile
          if (allFieldsMatchInitial && userProfile) {
            initialProfileRef.current = {
              products: updated.products,
              uniqueSellingProposition: updated.uniqueSellingProposition,
              targetMarket: updated.targetMarket,
              companySize: updated.companySize,
              revenueRange: updated.revenueRange,
              keyCredentials: updated.keyCredentials,
            };
          }
        }

        return updated;
      });
    }
  }, [userProfile, user]);

  // const addOrganization = () => {
  //   if (!newOrganization.name.trim() || !newOrganization.type ||
  //       !newOrganization.membershipLevel || !newOrganization.website.trim()) {
  //     toast({
  //       title: "Missing Required Fields",
  //       description: "Please fill in all required fields including organization name, type, membership level, and website.",
  //       variant: "destructive"
  //     })
  //     return
  //   }

  //   // URL validation for website
  //   try {
  //     new URL(newOrganization.website)
  //   } catch (e) {
  //     toast({
  //       title: "Invalid Website URL",
  //       description: "Please enter a valid website URL starting with http:// or https://",
  //       variant: "destructive"
  //     })
  //     return
  //   }

  //   // Validate profile URL if provided
  //   if (newOrganization.profileUrl && newOrganization.profileUrl.trim()) {
  //     try {
  //       new URL(newOrganization.profileUrl)
  //     } catch (e) {
  //       toast({
  //         title: "Invalid Profile URL",
  //         description: "Please enter a valid profile URL starting with http:// or https://",
  //         variant: "destructive"
  //       })
  //       return
  //     }
  //   }

  //   const organization = {
  //     id: toUTC().valueOf(),
  //     ...newOrganization,
  //     verificationStatus: "pending" as const,
  //     verificationMethod: "manual" as const
  //   }
  //   setProfile(prev => ({
  //     ...prev,
  //     professionalOrganizations: [...prev.professionalOrganizations, organization]
  //   }))
  //   setNewOrganization({
  //     name: "",
  //     type: "",
  //     membershipLevel: "",
  //     startDate: "",
  //     endDate: "",
  //     website: "",
  //     profileUrl: ""
  //   })

  //   toast({
  //     title: "Organization Added",
  //     description: "Successfully added to your professional organizations."
  //   })
  // }

  const handleDefaultOrgToggle = (orgId: string, checked: boolean) => {
    const orgIndex = defaultOrgs.findIndex((o) => o.id === orgId);
    if (orgIndex === -1) return;

    const updatedDefaultOrgs = [...defaultOrgs];
    updatedDefaultOrgs[orgIndex] = {
      ...updatedDefaultOrgs[orgIndex],
      selected: checked,
    };
    setDefaultOrgs(updatedDefaultOrgs);

    if (!checked) {
      // Remove from profile organizations and clear form fields
      const orgName = defaultOrgs[orgIndex].name;
      setProfile((prev) => ({
        ...prev,
        professionalOrganizations: prev.professionalOrganizations.filter(
          (org) => org.name !== orgName
        ),
      }));
      // Clear form fields
      updatedDefaultOrgs[orgIndex] = {
        ...updatedDefaultOrgs[orgIndex],
        website: "",
        profileUrl: "",
        membershipLevel: "",
        startDate: "",
      };
      setDefaultOrgs(updatedDefaultOrgs);
    }
  };

  const addDefaultOrganization = (orgId: string) => {
    const orgIndex = defaultOrgs.findIndex((o) => o.id === orgId);
    if (orgIndex === -1) return;

    const defaultOrg = defaultOrgs[orgIndex];

    // Validation
    if (
      !defaultOrg.website ||
      !defaultOrg.membershipLevel ||
      !defaultOrg.startDate
    ) {
      toast({
        title: "Missing Required Fields",
        description:
          "Please fill in membership level, start date, and website URL.",
        variant: "destructive",
      });
      return;
    }

    // URL validation
    try {
      new URL(defaultOrg.website);
    } catch {
      toast({
        title: "Invalid Website URL",
        description:
          "Please enter a valid website URL starting with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    // Validate profile URL if provided
    if (defaultOrg.profileUrl) {
      try {
        new URL(defaultOrg.profileUrl);
      } catch {
        toast({
          title: "Invalid Profile URL",
          description: "Please enter a valid profile URL.",
          variant: "destructive",
        });
        return;
      }
    }

    // Check if already added
    const alreadyExists = profile.professionalOrganizations.some(
      (org) => org.name === defaultOrg.name
    );

    if (alreadyExists) {
      toast({
        title: "Already Added",
        description: `${defaultOrg.name} is already in your organizations.`,
        variant: "destructive",
      });
      return;
    }

    // Create organization object
    const organization = {
      id: toUTC().valueOf(),
      name: defaultOrg.name,
      type: defaultOrg.type,
      membershipLevel: defaultOrg.membershipLevel,
      startDate: defaultOrg.startDate,
      endDate: "",
      website: defaultOrg.website,
      profileUrl: defaultOrg.profileUrl || "",
      verificationStatus: "pending" as const,
      verificationMethod: "manual" as const,
    };

    // Add to profile
    setProfile((prev) => ({
      ...prev,
      professionalOrganizations: [
        ...prev.professionalOrganizations,
        organization,
      ],
    }));

    toast({
      title: "Organization Added",
      description: `${defaultOrg.name} has been added to your profile.`,
    });
  };

  const removeOrganization = (id: number) => {
    setProfile((prev) => ({
      ...prev,
      professionalOrganizations: prev.professionalOrganizations.filter(
        (org) => org.id !== id
      ),
    }));
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case "verified":
        return "border-brand-success/30 bg-brand-success/10 text-brand-success";
      case "pending":
        return "border-brand-warning/30 bg-brand-warning/10 text-brand-warning";
      default:
        return "border-border bg-secondary text-muted-foreground";
    }
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <Shield className="h-3 w-3" />;
      case "pending":
        return <Search className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  interface ProfileSuggestions {
    bio?: string;
    uniqueSellingProposition?: string;
    products?: string;
    targetMarket?: string;
    companySize?: string;
    revenueRange?: string;
    keyCredentials?: string;
    industry?: string;
    lookingFor?: string[];
    canOffer?: string[];
  }
  const handleImplementProfilePlan = (suggestions: ProfileSuggestions) => {
    // Apply AI suggestions to profile state
    setProfile((prev) => ({
      ...prev,
      // Update fields based on AI suggestions
      ...(suggestions.bio && { bio: suggestions.bio }),
      ...(suggestions.uniqueSellingProposition && {
        uniqueSellingProposition: suggestions.uniqueSellingProposition,
      }),
      ...(suggestions.products && { products: suggestions.products }),
      ...(suggestions.targetMarket && {
        targetMarket: suggestions.targetMarket,
      }),
      ...(suggestions.companySize && { companySize: suggestions.companySize }),
      ...(suggestions.revenueRange && {
        revenueRange: suggestions.revenueRange,
      }),
      ...(suggestions.keyCredentials && {
        keyCredentials: suggestions.keyCredentials,
      }),
      ...(suggestions.industry && { industry: suggestions.industry }),
      ...(suggestions.lookingFor && { lookingFor: suggestions.lookingFor }),
      ...(suggestions.canOffer && { canOffer: suggestions.canOffer }),
    }));

    toast({
      title: "Profile Enhanced",
      description:
        "AI suggestions have been applied to your profile. Review and save when ready.",
    });
  };

  // Menu items configuration
  const menuItems = [
    { id: "profile", label: "Profile", icon: User },
    { id: "business", label: "Business", icon: Building },
    { id: "organizations", label: "Organizations", icon: Users },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "subscriptions", label: "Subscriptions", icon: Crown },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "preferences", label: "Preferences", icon: Mail },
  ];

  // Render profile header (photo + identity/stats)
  const formatName = (value: string) =>
    (value || "")
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

  const renderProfileHeader = () => (
    <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      {/* Profile Photo Card */}
      <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
        <div className="mb-4 flex items-center justify-center gap-2.5 sm:justify-start">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-amethyst/10 text-brand-amethyst">
            <Camera className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-brand-amethyst">
            Profile Photo
          </span>
        </div>
        <div className="flex flex-col items-center gap-4">
          <ProfileAvatar
            imageUrl={profilePhotoUrl}
            firstName={profile.firstName}
            lastName={profile.lastName}
            size="xl"
            showVerifiedBadge={false}
            isProfileLoading={isProfileDataLoading}
            isUploading={isUploading}
          />
          <input
            type="file"
            ref={fileInputRef}
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full max-w-[200px] bg-brand-gradient text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            {isUploading ? "Uploading..." : "Upload Photo"}
          </Button>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            JPG, PNG or JPEG • Max 3MB
          </p>
        </div>
      </div>

      {/* Identity + Stats Card */}
      <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-gradient-to-br from-brand-amethyst/10 to-brand-rose/10 p-6 shadow-sm">
        <h2 className="text-brand-gradient text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          {formatName(profile.firstName)} {formatName(profile.lastName)}
        </h2>
        {profile.title && (
          <p className="mt-1 text-sm font-bold text-foreground/70 sm:text-base">
            {profile.title}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {profile.location && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground/70">
              <Globe className="h-3.5 w-3.5 text-brand-amethyst" />
              {profile.location}
            </span>
          )}
          {profile.company && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground/70">
              <Building className="h-3.5 w-3.5 text-brand-amethyst" />
              {profile.company}
            </span>
          )}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2.5 pt-5 lg:grid-cols-4">
          {/* Trust Points */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-brand-card">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-sky/15 text-brand-sky">
              <Award className="h-[18px] w-[18px]" />
            </div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Trust Points
            </p>
            <div className="text-2xl font-extrabold leading-tight tracking-tight text-brand-sky">
              <AnimatedCounter value={trustPoints || 0} />
            </div>
          </div>

          {/* Connections */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-brand-card">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-amethyst/15 text-brand-amethyst">
              <Users className="h-[18px] w-[18px]" />
            </div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Connections
            </p>
            <div className="text-2xl font-extrabold leading-tight tracking-tight text-brand-amethyst">
              <AnimatedCounter value={connections || 0} />
            </div>
          </div>

          {/* Introductions */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-brand-card">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-success/15 text-brand-success">
              <UserCheck className="h-[18px] w-[18px]" />
            </div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Introductions
            </p>
            <div className="text-2xl font-extrabold leading-tight tracking-tight text-brand-success">
              <AnimatedCounter value={introductions || 0} />
            </div>
          </div>

          {/* Active Requests */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-brand-card">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-warning/15 text-brand-warning">
              <Target className="h-[18px] w-[18px]" />
            </div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Requests
            </p>
            <div className="text-2xl font-extrabold leading-tight tracking-tight text-brand-warning">
              <AnimatedCounter value={activeBounties || 0} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SEO
        title="Profile Settings - Prospectly"
        description="Manage your profile settings and networking preferences on Prospectly"
      />
      <div className="min-w-0 w-full">
        <div className="mx-auto min-w-0 w-full max-w-[1440px] p-4 md:p-6">
          {/* Profile Header - Always visible on all tabs */}
          {renderProfileHeader()}

          {/* Tabs Navigation */}
          <Tabs
            value={activeSection}
            onValueChange={handleTabChange}
            className="w-full min-w-0"
          >
            <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[300px_1fr]">
              {/* Left rail (desktop) / horizontal scroll strip (mobile) */}
              <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
                <TabsList className="flex h-auto w-full justify-start gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-2.5 shadow-sm [scrollbar-width:none] lg:flex-col lg:gap-1 [&::-webkit-scrollbar]:hidden">
                  <span className="hidden px-4 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground lg:block">
                    Account Settings
                  </span>
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <TabsTrigger
                        key={item.id}
                        value={item.id}
                        className={profileRailTriggerClassName}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="whitespace-nowrap">{item.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {/* Section Content */}
              <div className="min-w-0 space-y-6">
                {/* Profile Section */}
                <TabsContent value="profile" className="mt-0 min-w-0">
                  <ProfileInformation
                    ref={profileInformationRef}
                    profile={{
                      firstName: profile.firstName,
                      lastName: profile.lastName,
                      title: profile.title,
                      jobTitle: profile.title,
                      company: profile.company,
                      industry: profile.industry,
                      location: profile.location,
                      country: profile.country,
                      bio: profile.bio,
                      email: profile.email,
                      phone: profile.phone,
                      linkedinUrl: profile.linkedinUrl,
                      websiteUrl: profile.websiteUrl,
                      isUserUnsubscribe: profile.isUserUnsubscribe,
                    }}
                    onFormChange={(field, value) => {
                      // Sync form values to parent state so they persist across section switches
                      // Map jobTitle to title to match profile state structure
                      if (field === "jobTitle") {
                        setProfile((prev) => ({
                          ...prev,
                          title: value as string,
                        }));
                      } else {
                        setProfile((prev) => ({ ...prev, [field]: value }));
                      }
                    }}
                    onProfileUpdate={(updatedProfile: {
                      firstName?: string;
                      lastName?: string;
                      jobTitle?: string;
                      company?: string;
                      industry?: string;
                      location?: string;
                      country?: string;
                      bio?: string;
                      phone?: string;
                      linkedinUrl?: string;
                      websiteUrl?: string;
                      isUserUnsubscribe?: boolean;
                    }) => {
                      userProfileRef.current = updatedProfile;
                      setUserProfile(updatedProfile);
                      // Update local profile state
                      setProfile((prev) => ({
                        ...prev,
                        firstName: updatedProfile.firstName || prev.firstName,
                        lastName: updatedProfile.lastName || prev.lastName,
                        title: updatedProfile.jobTitle || prev.title,
                        company: updatedProfile.company || prev.company,
                        industry: updatedProfile.industry || prev.industry,
                        location: updatedProfile.location || prev.location,
                        country: updatedProfile.country || prev.country,
                        bio: updatedProfile.bio || prev.bio,
                        phone: updatedProfile.phone || prev.phone,
                        linkedinUrl:
                          updatedProfile.linkedinUrl || prev.linkedinUrl,
                        websiteUrl:
                          updatedProfile.websiteUrl || prev.websiteUrl,
                        isUserUnsubscribe:
                          updatedProfile.isUserUnsubscribe ??
                          prev.isUserUnsubscribe,
                      }));
                    }}
                    highlightField={highlightField || undefined}
                    isHighlightActive={isHighlightActive}
                    errors={basicProfileErrors}
                  />

                  <div className="mb-6 mt-6">
                    <Button
                      onClick={async () => {
                        await handleSave();
                      }}
                      className="w-full bg-brand-gradient text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
                      size="lg"
                      disabled={isLoading}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                </TabsContent>

                {/* Business Section */}
                <TabsContent value="business" className="mt-0 min-w-0">
                  <BusinessProfile
                    ref={businessProfileRef}
                    profile={{
                      products: profile.products,
                      uniqueSellingProposition:
                        profile.uniqueSellingProposition,
                      targetMarket: profile.targetMarket,
                      companySize: profile.companySize,
                      revenueRange: profile.revenueRange,
                      keyCredentials: profile.keyCredentials,
                    }}
                    onProfileChange={(field, value) => {
                      setProfile((prev) => ({ ...prev, [field]: value }));
                    }}
                    errors={businessProfileErrors}
                  />
                  <div className="mb-6 mt-6">
                    <Button
                      onClick={async () => {
                        await handleSave();
                      }}
                      className="w-full bg-brand-gradient text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
                      size="lg"
                      disabled={isLoading}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? "Saving..." : "Save Business Profile"}
                    </Button>
                  </div>
                </TabsContent>

                {/* Organizations Section */}
                <TabsContent value="organizations" className="mt-0 min-w-0">
                  <Card className="rounded-2xl border border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-warning/10 text-brand-warning">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-extrabold tracking-tight">
                            Professional Organizations
                          </CardTitle>
                          <CardDescription>
                            Select from popular organizations or add your own
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      {/* Section 1: Default Organizations - Opt-In Cards */}
                      {/* <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Crown className="h-5 w-5 text-amber-600" />
                        Popular Organizations
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {defaultOrgs.map((defaultOrg) => (
                          <Card
                            key={defaultOrg.id}
                            className="border-2 hover:border-primary/50 transition-all hover:shadow-lg"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                                    <Users className="h-5 w-5 text-amber-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">
                                      {defaultOrg.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      {defaultOrg.type}
                                    </p>
                                  </div>
                                </div>
                                <Checkbox
                                  checked={defaultOrg.selected}
                                  onCheckedChange={(checked) =>
                                    handleDefaultOrgToggle(
                                      defaultOrg.id,
                                      !!checked
                                    )
                                  }
                                  className="mt-1"
                                />
                              </div>

                              {/* Expandable form when selected */}
                      {/* {defaultOrg.selected && (
                                <div className="space-y-3 mt-4 pt-4 border-t">
                                  <div>
                                    <Label className="text-xs">
                                      Membership Level *
                                    </Label>
                                    <Select
                                      value={defaultOrg.membershipLevel}
                                      onValueChange={(value) => {
                                        const orgIndex = defaultOrgs.findIndex(
                                          (o) => o.id === defaultOrg.id
                                        );
                                        const updatedOrgs = [...defaultOrgs];
                                        updatedOrgs[orgIndex] = {
                                          ...defaultOrg,
                                          membershipLevel: value,
                                        };
                                        setDefaultOrgs(updatedOrgs);
                                      }}
                                    >
                                      <SelectTrigger className="text-xs h-8">
                                        <SelectValue placeholder="Select level" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Member">
                                          Member
                                        </SelectItem>
                                        <SelectItem value="Board Member">
                                          Board Member
                                        </SelectItem>
                                        <SelectItem value="Chapter Leader">
                                          Chapter Leader
                                        </SelectItem>
                                        <SelectItem value="Committee Chair">
                                          Committee Chair
                                        </SelectItem>
                                        <SelectItem value="Officer">
                                          Officer
                                        </SelectItem>
                                        <SelectItem value="Founder">
                                          Founder
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">
                                      Start Date *
                                    </Label>
                                    <Input
                                      type="month"
                                      className="text-xs h-8"
                                      value={defaultOrg.startDate}
                                      onChange={(e) => {
                                        const orgIndex = defaultOrgs.findIndex(
                                          (o) => o.id === defaultOrg.id
                                        );
                                        const updatedOrgs = [...defaultOrgs];
                                        updatedOrgs[orgIndex] = {
                                          ...defaultOrg,
                                          startDate: e.target.value,
                                        };
                                        setDefaultOrgs(updatedOrgs);
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs flex items-center gap-1">
                                      Website URL *
                                      <span className="text-destructive">
                                        Required
                                      </span>
                                    </Label>
                                    <Input
                                      type="url"
                                      placeholder={`https://${defaultOrg.name.toLowerCase().replace(/\s+/g, "")}.com`}
                                      className="text-xs h-8"
                                      value={defaultOrg.website}
                                      onChange={(e) => {
                                        const orgIndex = defaultOrgs.findIndex(
                                          (o) => o.id === defaultOrg.id
                                        );
                                        const updatedOrgs = [...defaultOrgs];
                                        updatedOrgs[orgIndex] = {
                                          ...defaultOrg,
                                          website: e.target.value,
                                        };
                                        setDefaultOrgs(updatedOrgs);
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">
                                      Your Profile URL (Optional)
                                    </Label>
                                    <Input
                                      type="url"
                                      placeholder="Your member profile link..."
                                      className="text-xs h-8"
                                      value={defaultOrg.profileUrl}
                                      onChange={(e) => {
                                        const orgIndex = defaultOrgs.findIndex(
                                          (o) => o.id === defaultOrg.id
                                        );
                                        const updatedOrgs = [...defaultOrgs];
                                        updatedOrgs[orgIndex] = {
                                          ...defaultOrg,
                                          profileUrl: e.target.value,
                                        };
                                        setDefaultOrgs(updatedOrgs);
                                      }}
                                    />
                                  </div>
                                  <Button
                                    size="sm"
                                    className="w-full h-8"
                                    onClick={() =>
                                      addDefaultOrganization(defaultOrg.id)
                                    }
                                    disabled={
                                      !defaultOrg.website ||
                                      !defaultOrg.membershipLevel ||
                                      !defaultOrg.startDate
                                    }
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Save to Profile
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div> */}

                      {/* Section 2: Current Organizations List */}
                      {userOrgs.length > 0 && (
                        <div>
                          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
                            <Shield className="h-4 w-4 text-brand-warning" />
                            Your Organizations
                          </h3>
                          <div
                            className="space-y-3 overflow-y-auto pr-1"
                            style={{
                              maxHeight: "max(400px, calc(4 * 105px))", // Roughly 4 items
                              scrollbarWidth: "thin",
                            }}
                          >
                            {userOrgs.map((org: AnyType) => (
                              <Card
                                key={org.id}
                                className="rounded-xl border border-border bg-secondary/40 shadow-none transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-brand-card"
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <h5 className="text-base font-bold">
                                        {org.name}
                                      </h5>
                                      <p className="text-sm text-muted-foreground mt-0.5">
                                        {org.type}
                                        {org.membershipLevel && (
                                          <> • {org.membershipLevel}</>
                                        )}
                                      </p>
                                      {org.joinedAt && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Since{" "}
                                          {toUTC(
                                            org.joinedAt
                                          ).toLocaleDateString("en-US", {
                                            month: "short",
                                            year: "numeric",
                                          })}
                                        </p>
                                      )}

                                      {/* Display website and profile URL */}
                                      {org.website && (
                                        <div className="flex items-center gap-2 mt-2">
                                          <Globe className="h-3 w-3 text-muted-foreground" />
                                          <a
                                            href={org.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-brand-rose hover:underline"
                                          >
                                            Website
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${getVerificationColor(org.isVerified ? "verified" : "pending")}`}
                                      >
                                        {getVerificationIcon(
                                          org.isVerified
                                            ? "verified"
                                            : "pending"
                                        )}
                                        <span className="ml-1 capitalize">
                                          {org.isVerified
                                            ? "Verified"
                                            : "Pending"}
                                        </span>
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {isOrgsLoading && <Loader />}

                      {!isOrgsLoading && userOrgs.length === 0 && (
                        <div className="rounded-xl border-2 border-dashed border-border bg-secondary/30 p-12 text-center">
                          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                          <h4 className="font-bold text-muted-foreground">
                            No organizations found
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            You haven't joined any professional organizations
                            yet.
                          </p>
                        </div>
                      )}

                      {/* Section 3: Add Custom Organization Form */}
                      {/* <div className="p-4 bg-muted/30 rounded-lg border-2 border-dashed">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Custom Organization
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Organization Name *</Label>
                        <Input
                          placeholder="e.g. Young Presidents' Organization"
                          value={newOrganization.name}
                          onChange={(e) => setNewOrganization(prev => ({...prev, name: e.target.value}))}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Type *</Label>
                        <Select 
                          value={newOrganization.type}
                          onValueChange={(value) => setNewOrganization(prev => ({...prev, type: value}))}
                        >
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Executive Group">Executive Group</SelectItem>
                            <SelectItem value="Industry Association">Industry Association</SelectItem>
                            <SelectItem value="Alumni">Alumni</SelectItem>
                            <SelectItem value="Professional Board">Professional Board</SelectItem>
                            <SelectItem value="Trade Organization">Trade Organization</SelectItem>
                            <SelectItem value="Networking Group">Networking Group</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Membership Level *</Label>
                        <Select 
                          value={newOrganization.membershipLevel}
                          onValueChange={(value) => setNewOrganization(prev => ({...prev, membershipLevel: value}))}
                        >
                          <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Member">Member</SelectItem>
                            <SelectItem value="Board Member">Board Member</SelectItem>
                            <SelectItem value="Chapter Leader">Chapter Leader</SelectItem>
                            <SelectItem value="Committee Chair">Committee Chair</SelectItem>
                            <SelectItem value="Officer">Officer</SelectItem>
                            <SelectItem value="Founder">Founder</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Start Date *</Label>
                        <Input
                          type="month"
                          value={newOrganization.startDate}
                          onChange={(e) => setNewOrganization(prev => ({...prev, startDate: e.target.value}))}
                        />
                      </div> */}

                      {/* NEW FIELDS */}
                      {/* 
                      <div>
                        <Label className="text-sm flex items-center gap-1">
                          Organization Website * 
                          <span className="text-xs text-destructive">Required</span>
                        </Label>
                        <Input
                          type="url"
                          placeholder="https://organization.com"
                          value={newOrganization.website}
                          onChange={(e) => setNewOrganization(prev => ({...prev, website: e.target.value}))}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Your Profile URL (Optional)</Label>
                        <Input
                          type="url"
                          placeholder="https://organization.com/member/yourname"
                          value={newOrganization.profileUrl}
                          onChange={(e) => setNewOrganization(prev => ({...prev, profileUrl: e.target.value}))}
                        />
                      </div>
                    </div>
                    */}

                      {/*  
                    <Button 
                      onClick={addOrganization} 
                      className="w-full mt-4"
                      disabled={!newOrganization.name || !newOrganization.website}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Organization
                    </Button>
                  </div> */}

                      {/* Save Button at Bottom */}
                      {/* <div className="pt-6 border-t">
                      <Button
                        onClick={handleSave}
                        className="w-full"
                        size="lg"
                        disabled={isLoading}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? "Saving..." : "Save Organizations"}
                      </Button>
                    </div> */}

                      {/* Email Preferences Card (Minimal Version) */}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Privacy Section */}
                <TabsContent value="privacy" className="mt-0 min-w-0">
                  <PrivacySectionContent
                    privacyPage={privacyPage}
                    setPrivacyPage={setPrivacyPage}
                    privacyLimit={privacyLimit}
                    setPrivacyLimit={setPrivacyLimit}
                    privacySearch={privacySearch}
                    setPrivacySearch={setPrivacySearch}
                    isPrivacyDialogOpen={isPrivacyDialogOpen}
                    setIsPrivacyDialogOpen={setIsPrivacyDialogOpen}
                    editingPrivacy={editingPrivacy}
                    setEditingPrivacy={setEditingPrivacy}
                    deletingPrivacy={deletingPrivacy}
                    setDeletingPrivacy={setDeletingPrivacy}
                    queryClient={queryClient}
                    toast={toast}
                  />
                </TabsContent>

                {/* Subscriptions Section */}
                <TabsContent value="subscriptions" className="mt-0 min-w-0">
                  {isSubscriptionsLoading ? (
                    <Loader />
                  ) : (
                    <div className="space-y-6">
                      <CurrentSubscription />
                      <SubscriptionPlans />
                    </div>
                  )}
                </TabsContent>

                {/* Settings Section */}
                <TabsContent value="settings" className="mt-0 min-w-0 space-y-6">
                  <AccountDangerZone
                    initialWizardOpen={searchParams.get("delete") === "1"}
                  />
                </TabsContent>

                {/* Email Preferences Section */}
                <TabsContent value="preferences" className="mt-0 min-w-0">
                  <ProfileEmailPreferencesSection />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>

      {/* ProspectlyGPT Component */}
      <ProspectlyGPT
        isOpen={showGPT}
        onOpenChange={setShowGPT}
        onImplementPlan={handleImplementProfilePlan}
      />

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onSuccess={() => {
          setShowAddPaymentModal(false);
          toast({
            title: "Payment Method Added",
            description: "Your payment method has been added successfully.",
          });
        }}
      />

      {/* Profile Photo Cropper */}
      {selectedImage && (
        <ProfilePhotoCropper
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setSelectedImage(null);
          }}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
};

export default ProfileSettings;
