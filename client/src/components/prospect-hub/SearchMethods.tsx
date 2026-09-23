import type { ChangeEvent, KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Linkedin,
  User,
  Building2,
  Globe,
  AtSign,
  HelpCircle,
  Loader2,
  AlertCircle as AlertIcon,
  CheckCircle2,
} from "lucide-react";

interface SearchMethodsProps {
  linkedinUrl: string;
  setLinkedinUrl: (url: string) => void;
  profileName: string;
  setProfileName: (name: string) => void;
  profileEmail: string;
  setProfileEmail: (email: string) => void;
  profileCompany: string;
  setProfileCompany: (company: string) => void;
  profileWebsite: string;
  setProfileWebsite: (website: string) => void;
  isSearching: boolean;
  isSearchValid: boolean;
  isValidLinkedinInput: (input: string) => boolean;
  searchHint: SearchHint | null;
  hasName: boolean;
  hasEmail: boolean;
  hasCompany: boolean;
  hasWebsite: boolean;
  onSearch: () => void;
  onClear: () => void;
}

type SearchHint = { message: string; type: "info" | "warning" | "success" };

type SearchInputHandlersParams = {
  isDisabled: boolean;
  isSearchValid: boolean;
  onSearch: () => void;
  onValueChange: (value: string) => void;
};

function createSearchInputHandlers({
  isDisabled,
  isSearchValid,
  onSearch,
  onValueChange,
}: SearchInputHandlersParams) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isDisabled) {
      onValueChange(event.target.value);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && isSearchValid && !isDisabled) {
      onSearch();
    }
  };
  return { onChange, onKeyDown };
}

function getLinkedinInputClassName({
  hasLinkedinInput,
  isLinkedinInputValid,
  isDisabled,
}: {
  hasLinkedinInput: boolean;
  isLinkedinInputValid: boolean;
  isDisabled: boolean;
}) {
  return cn(
    "pl-10 h-11 border-2",
    hasLinkedinInput &&
      !isLinkedinInputValid &&
      "border-red-300 focus:border-red-500",
    hasLinkedinInput &&
      isLinkedinInputValid &&
      "border-green-300 focus:border-green-500",
    isDisabled && "opacity-60 cursor-not-allowed"
  );
}

function getProfileFieldInputClassName({
  isFieldFilled,
  isDisabled,
}: {
  isFieldFilled: boolean;
  isDisabled: boolean;
}) {
  return cn(
    "pl-10 h-11 border-2",
    isFieldFilled && "border-green-300 focus:border-green-500",
    isDisabled && "opacity-60 cursor-not-allowed"
  );
}

function getSearchHintBannerClassName(type: SearchHint["type"]) {
  const base =
    "text-[12.5px] font-bold flex items-start gap-2 p-3 rounded-lg border";
  if (type === "success") {
    return cn(
      base,
      "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
    );
  }
  if (type === "warning") {
    return cn(
      base,
      "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
    );
  }
  return cn(base, "text-muted-foreground bg-muted/50 border-border");
}

function SearchHintIcon({ type }: { type: SearchHint["type"] }) {
  const iconClassName = "h-4 w-4 mt-0.5 flex-shrink-0";
  if (type === "success") {
    return <CheckCircle2 className={iconClassName} />;
  }
  if (type === "warning") {
    return <AlertIcon className={iconClassName} />;
  }
  return <HelpCircle className={iconClassName} />;
}

function SearchHintBanner({ searchHint }: { searchHint: SearchHint }) {
  return (
    <div className={getSearchHintBannerClassName(searchHint.type)}>
      <SearchHintIcon type={searchHint.type} />
      <span className="flex-1">{searchHint.message}</span>
    </div>
  );
}

function IconSearchInput({
  icon: Icon,
  placeholder,
  value,
  inputType,
  testId,
  className,
  isDisabled,
  handlers,
}: {
  icon: LucideIcon;
  placeholder: string;
  value: string;
  inputType?: string;
  testId: string;
  className: string;
  isDisabled: boolean;
  handlers: ReturnType<typeof createSearchInputHandlers>;
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        type={inputType}
        value={value}
        onChange={handlers.onChange}
        onKeyDown={handlers.onKeyDown}
        disabled={isDisabled}
        className={className}
        data-testid={testId}
      />
    </div>
  );
}

function LinkedInSearchSection({
  linkedinUrl,
  setLinkedinUrl,
  isDisabled,
  isSearchValid,
  isValidLinkedinInput,
  onSearch,
}: {
  linkedinUrl: string;
  setLinkedinUrl: (url: string) => void;
  isDisabled: boolean;
  isSearchValid: boolean;
  isValidLinkedinInput: (input: string) => boolean;
  onSearch: () => void;
}) {
  const hasLinkedinInput = linkedinUrl.trim().length > 0;
  const isLinkedinInputValid =
    hasLinkedinInput && isValidLinkedinInput(linkedinUrl);
  const handlers = createSearchInputHandlers({
    isDisabled,
    isSearchValid,
    onSearch,
    onValueChange: setLinkedinUrl,
  });

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-bold text-[13.5px] mb-1 flex items-center gap-2">
          <Linkedin className="h-5 w-5 text-brand-sky" />
          Search by LinkedIn Profile
        </h4>
        <p className="text-[12.5px] text-muted-foreground">
          Already know who you're looking to meet? Enter their LinkedIn profile
          below to find them.
        </p>
      </div>
      <div className="space-y-2">
        <IconSearchInput
          icon={Linkedin}
          placeholder="linkedin.com/in/username"
          value={linkedinUrl}
          testId="input-linkedin-url"
          isDisabled={isDisabled}
          handlers={handlers}
          className={getLinkedinInputClassName({
            hasLinkedinInput,
            isLinkedinInputValid,
            isDisabled,
          })}
        />
        {hasLinkedinInput && !isLinkedinInputValid && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertIcon className="h-3 w-3" />
            Enter a valid LinkedIn URL or username (e.g., linkedin.com/in/name
            or just john-doe)
          </p>
        )}
        {isLinkedinInputValid && (
          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Ready to search
          </p>
        )}
      </div>
    </div>
  );
}

function ProfileDetailsSearchSection({
  profileName,
  setProfileName,
  profileEmail,
  setProfileEmail,
  profileCompany,
  setProfileCompany,
  profileWebsite,
  setProfileWebsite,
  isDisabled,
  isSearchValid,
  hasName,
  hasEmail,
  hasCompany,
  hasWebsite,
  onSearch,
}: {
  profileName: string;
  setProfileName: (name: string) => void;
  profileEmail: string;
  setProfileEmail: (email: string) => void;
  profileCompany: string;
  setProfileCompany: (company: string) => void;
  profileWebsite: string;
  setProfileWebsite: (website: string) => void;
  isDisabled: boolean;
  isSearchValid: boolean;
  hasName: boolean;
  hasEmail: boolean;
  hasCompany: boolean;
  hasWebsite: boolean;
  onSearch: () => void;
}) {
  const sharedHandlers = { isDisabled, isSearchValid, onSearch };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-bold text-[13.5px] mb-1 flex items-center gap-2">
          <User className="h-5 w-5 text-brand-amethyst" />
          Search by Name
        </h4>
        <p className="text-[12.5px] text-muted-foreground">
          Don't have their LinkedIn profile? Enter their information here.
        </p>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <IconSearchInput
            icon={User}
            placeholder="Full name"
            value={profileName}
            testId="input-profile-name"
            isDisabled={isDisabled}
            handlers={createSearchInputHandlers({
              ...sharedHandlers,
              onValueChange: setProfileName,
            })}
            className={getProfileFieldInputClassName({
              isFieldFilled: hasName,
              isDisabled,
            })}
          />
          <IconSearchInput
            icon={AtSign}
            placeholder="Email address"
            value={profileEmail}
            inputType="email"
            testId="input-profile-email"
            isDisabled={isDisabled}
            handlers={createSearchInputHandlers({
              ...sharedHandlers,
              onValueChange: setProfileEmail,
            })}
            className={getProfileFieldInputClassName({
              isFieldFilled: hasEmail,
              isDisabled,
            })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <IconSearchInput
            icon={Building2}
            placeholder="Company"
            value={profileCompany}
            testId="input-profile-company"
            isDisabled={isDisabled}
            handlers={createSearchInputHandlers({
              ...sharedHandlers,
              onValueChange: setProfileCompany,
            })}
            className={getProfileFieldInputClassName({
              isFieldFilled: hasCompany,
              isDisabled,
            })}
          />
          <IconSearchInput
            icon={Globe}
            placeholder="Website"
            value={profileWebsite}
            testId="input-profile-website"
            isDisabled={isDisabled}
            handlers={createSearchInputHandlers({
              ...sharedHandlers,
              onValueChange: setProfileWebsite,
            })}
            className={getProfileFieldInputClassName({
              isFieldFilled: hasWebsite,
              isDisabled,
            })}
          />
        </div>
      </div>
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

function SearchFormFooter({
  searchHint,
  isSearching,
  isDisabled,
  isSearchValid,
  onSearch,
  onClear,
}: {
  searchHint: SearchHint | null;
  isSearching: boolean;
  isDisabled: boolean;
  isSearchValid: boolean;
  onSearch: () => void;
  onClear: () => void;
}) {
  return (
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
  );
}

export function SearchMethods({
  linkedinUrl,
  setLinkedinUrl,
  profileName,
  setProfileName,
  profileEmail,
  setProfileEmail,
  profileCompany,
  setProfileCompany,
  profileWebsite,
  setProfileWebsite,
  isSearching,
  isSearchValid,
  isValidLinkedinInput,
  searchHint,
  hasName,
  hasEmail,
  hasCompany,
  hasWebsite,
  onSearch,
  onClear,
}: SearchMethodsProps) {
  const isDisabled = isSearching;

  return (
    <Card className="border border-border rounded-2xl shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LinkedInSearchSection
            linkedinUrl={linkedinUrl}
            setLinkedinUrl={setLinkedinUrl}
            isDisabled={isDisabled}
            isSearchValid={isSearchValid}
            isValidLinkedinInput={isValidLinkedinInput}
            onSearch={onSearch}
          />
          <ProfileDetailsSearchSection
            profileName={profileName}
            setProfileName={setProfileName}
            profileEmail={profileEmail}
            setProfileEmail={setProfileEmail}
            profileCompany={profileCompany}
            setProfileCompany={setProfileCompany}
            profileWebsite={profileWebsite}
            setProfileWebsite={setProfileWebsite}
            isDisabled={isDisabled}
            isSearchValid={isSearchValid}
            hasName={hasName}
            hasEmail={hasEmail}
            hasCompany={hasCompany}
            hasWebsite={hasWebsite}
            onSearch={onSearch}
          />
        </div>
        <SearchFormFooter
          searchHint={searchHint}
          isSearching={isSearching}
          isDisabled={isDisabled}
          isSearchValid={isSearchValid}
          onSearch={onSearch}
          onClear={onClear}
        />
      </CardContent>
    </Card>
  );
}
