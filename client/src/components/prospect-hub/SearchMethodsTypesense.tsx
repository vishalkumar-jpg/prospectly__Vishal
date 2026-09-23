import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  User,
  Building2,
  Globe,
  Briefcase,
  MapPin,
  HelpCircle,
  Loader2,
  AlertCircle as AlertIcon,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

interface SearchMethodsTypesenseProps {
  profileName: string;
  setProfileName: (name: string) => void;
  profileTitle: string;
  setProfileTitle: (title: string) => void;
  profileCompany: string;
  setProfileCompany: (company: string) => void;
  profileWebsite: string;
  setProfileWebsite: (website: string) => void;
  profileLocation: string;
  setProfileLocation: (location: string) => void;
  isSearching: boolean;
  isSearchValid: boolean;
  searchHint: SearchHint | null;
  hasName: boolean;
  hasTitle: boolean;
  hasCompany: boolean;
  hasWebsite: boolean;
  hasLocation: boolean;
  onSearch: () => void;
  onClear: () => void;
}

type SearchHint = { message: string; type: "info" | "warning" | "success" };

type ProfileSearchFieldParams = {
  icon: LucideIcon;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  isDisabled: boolean;
  hasValue: boolean;
  isSearchValid: boolean;
  onSearch: () => void;
  testId: string;
};

type ProfileSearchFieldGridParams = {
  fields: Omit<
    ProfileSearchFieldParams,
    "isDisabled" | "isSearchValid" | "onSearch"
  >[];
  isDisabled: boolean;
  isSearchValid: boolean;
  onSearch: () => void;
};

const HINT_BANNER_CLASSES: Record<SearchHint["type"], string> = {
  success:
    "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
  warning:
    "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
  info: "text-muted-foreground bg-muted/50 border-border",
};

const HINT_ICONS: Record<SearchHint["type"], LucideIcon> = {
  success: CheckCircle2,
  warning: AlertIcon,
  info: HelpCircle,
};

function ProfileSearchField({
  icon: Icon,
  placeholder,
  value,
  onValueChange,
  isDisabled,
  hasValue,
  isSearchValid,
  onSearch,
  testId,
}: ProfileSearchFieldParams) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          if (!isDisabled) {
            onValueChange(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && isSearchValid && !isDisabled) {
            onSearch();
          }
        }}
        disabled={isDisabled}
        className={cn(
          "pl-10 h-11 border-2",
          hasValue && "border-green-300 focus:border-green-500",
          isDisabled && "opacity-60 cursor-not-allowed"
        )}
        data-testid={testId}
      />
    </div>
  );
}

function ProfileSearchFieldGrid({
  fields,
  isDisabled,
  isSearchValid,
  onSearch,
}: ProfileSearchFieldGridParams) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map((field) => (
        <ProfileSearchField
          key={field.testId}
          {...field}
          isDisabled={isDisabled}
          isSearchValid={isSearchValid}
          onSearch={onSearch}
        />
      ))}
    </div>
  );
}

function SearchHintBanner({ searchHint }: { searchHint: SearchHint }) {
  const HintIcon = HINT_ICONS[searchHint.type];

  return (
    <div
      className={cn(
        "text-[12.5px] font-bold flex items-start gap-2 p-3 rounded-lg border",
        HINT_BANNER_CLASSES[searchHint.type]
      )}
    >
      <HintIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span className="flex-1">{searchHint.message}</span>
    </div>
  );
}

function SearchProspectsActions({
  isSearching,
  isDisabled,
  isSearchValid,
  onSearch,
  onClear,
}: {
  isSearching: boolean;
  isDisabled: boolean;
  isSearchValid: boolean;
  onSearch: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        onClick={onSearch}
        disabled={isDisabled || !isSearchValid}
        className="w-[80%] h-11 text-[14.5px] font-bold bg-brand-gradient text-brand-foreground shadow-brand-cta hover:shadow-brand-cta-lg transition-shadow border-0"
        size="lg"
      >
        {isSearching ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="h-5 w-5 mr-2" />
            Search Prospects
          </>
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onClear}
        disabled={isDisabled}
        className="w-[20%] h-11 text-[14px] font-bold border-border"
        size="lg"
      >
        Clear Filter
      </Button>
    </div>
  );
}

function buildNameTitleFields({
  profileName,
  setProfileName,
  profileTitle,
  setProfileTitle,
  hasName,
  hasTitle,
}: Pick<
  SearchMethodsTypesenseProps,
  | "profileName"
  | "setProfileName"
  | "profileTitle"
  | "setProfileTitle"
  | "hasName"
  | "hasTitle"
>): ProfileSearchFieldGridParams["fields"] {
  return [
    {
      icon: User,
      placeholder: "Name",
      value: profileName,
      onValueChange: setProfileName,
      hasValue: hasName,
      testId: "input-profile-name",
    },
    {
      icon: Briefcase,
      placeholder: "Job title (e.g., VP of Sales)",
      value: profileTitle,
      onValueChange: setProfileTitle,
      hasValue: hasTitle,
      testId: "input-profile-title",
    },
  ];
}

function buildCompanyWebsiteFields({
  profileCompany,
  setProfileCompany,
  profileWebsite,
  setProfileWebsite,
  hasCompany,
  hasWebsite,
}: Pick<
  SearchMethodsTypesenseProps,
  | "profileCompany"
  | "setProfileCompany"
  | "profileWebsite"
  | "setProfileWebsite"
  | "hasCompany"
  | "hasWebsite"
>): ProfileSearchFieldGridParams["fields"] {
  return [
    {
      icon: Building2,
      placeholder: "Company",
      value: profileCompany,
      onValueChange: setProfileCompany,
      hasValue: hasCompany,
      testId: "input-profile-company",
    },
    {
      icon: Globe,
      placeholder: "Website",
      value: profileWebsite,
      onValueChange: setProfileWebsite,
      hasValue: hasWebsite,
      testId: "input-profile-website",
    },
  ];
}

export function SearchMethodsTypesense(props: SearchMethodsTypesenseProps) {
  const {
    profileLocation,
    setProfileLocation,
    isSearching,
    isSearchValid,
    searchHint,
    hasLocation,
    onSearch,
    onClear,
  } = props;

  const isDisabled = isSearching;
  const sharedFieldProps = { isDisabled, isSearchValid, onSearch };
  const nameTitleFields = buildNameTitleFields(props);
  const companyWebsiteFields = buildCompanyWebsiteFields(props);

  return (
    <Card className="border border-border rounded-2xl shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-[13.5px] mb-1 flex items-center gap-2">
              <Search className="h-4 w-4 text-brand-amethyst shrink-0" />
              Search by any of Name, Title, Company, Website, or Location to
              find prospects.
            </h4>
          </div>
          <div className="space-y-3">
            <ProfileSearchFieldGrid
              fields={nameTitleFields}
              {...sharedFieldProps}
            />
            <ProfileSearchFieldGrid
              fields={companyWebsiteFields}
              {...sharedFieldProps}
            />
            <ProfileSearchField
              icon={MapPin}
              placeholder="Location (city, state, or country)"
              value={profileLocation}
              onValueChange={setProfileLocation}
              hasValue={hasLocation}
              testId="input-profile-location"
              {...sharedFieldProps}
            />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {searchHint ? <SearchHintBanner searchHint={searchHint} /> : null}
          <SearchProspectsActions
            isSearching={isSearching}
            isDisabled={isDisabled}
            isSearchValid={isSearchValid}
            onSearch={onSearch}
            onClear={onClear}
          />
        </div>
      </CardContent>
    </Card>
  );
}
