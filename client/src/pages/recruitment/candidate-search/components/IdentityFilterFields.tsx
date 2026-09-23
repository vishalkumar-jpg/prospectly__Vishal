import { Input } from "@/components/ui/input";
import { FacetMultiSelect } from "./FacetMultiSelect";
import { Field } from "./FilterFieldControls";
import { FilterGroup } from "./FilterGroup";
import {
  EMPTY_FACET,
  toggleNumber,
  toggleString,
  type FilterSectionProps,
} from "./filter-fields.shared";

export function IdentityFilterFields({
  draft,
  facets,
  facetsLoading,
  patch,
  field,
}: FilterSectionProps) {
  const postingOptions = facets?.postings;
  const postings = postingOptions ?? EMPTY_FACET;
  const selectedJobs = draft.jobIds.length;
  const scopeNote =
    selectedJobs === 0
      ? "All candidates, all postings"
      : postingOptions == null
        ? `${selectedJobs} selected`
        : `${selectedJobs} of ${postingOptions.length} postings`;

  return (
    <>
      <FilterGroup title="Scope" activeCount={draft.jobIds.length}>
        <FacetMultiSelect
          id={field("postings")}
          label="Postings"
          placeholder="All postings"
          options={postings}
          loading={facetsLoading}
          selected={draft.jobIds}
          onToggle={(value) =>
            patch((next) => {
              next.jobIds = toggleString(next.jobIds, value);
            })
          }
          onClear={() =>
            patch((next) => {
              next.jobIds = [];
            })
          }
        />
        <span className="text-xs text-muted-foreground">{scopeNote}</span>
      </FilterGroup>

      <FilterGroup
        title="Role & skills"
        activeCount={draft.titles.length + draft.skills.length}
      >
        <Field label="Job title" htmlFor={field("titles")}>
          <FacetMultiSelect
            id={field("titles")}
            label="Job title"
            placeholder="Any title"
            options={facets?.titles ?? EMPTY_FACET}
            loading={facetsLoading}
            selected={draft.titles}
            onToggle={(value) =>
              patch((next) => {
                next.titles = toggleString(next.titles, value);
              })
            }
            onClear={() =>
              patch((next) => {
                next.titles = [];
              })
            }
          />
        </Field>
        <Field
          label="Skills"
          hint="one hit qualifies"
          htmlFor={field("skills")}
        >
          <FacetMultiSelect
            id={field("skills")}
            label="Skills"
            placeholder="Any skill"
            options={facets?.skills ?? EMPTY_FACET}
            loading={facetsLoading}
            selected={draft.skills}
            onToggle={(value) =>
              patch((next) => {
                next.skills = toggleString(next.skills, value);
              })
            }
            onClear={() =>
              patch((next) => {
                next.skills = [];
              })
            }
          />
        </Field>
      </FilterGroup>

      <FilterGroup
        title="Company & industry"
        activeCount={draft.companies.length + draft.industryIds.length}
      >
        <Field label="Company" htmlFor={field("companies")}>
          <FacetMultiSelect
            id={field("companies")}
            label="Company"
            placeholder="Any company"
            options={facets?.companies ?? EMPTY_FACET}
            loading={facetsLoading}
            selected={draft.companies}
            onToggle={(value) =>
              patch((next) => {
                next.companies = toggleString(next.companies, value);
              })
            }
            onClear={() =>
              patch((next) => {
                next.companies = [];
              })
            }
          />
        </Field>
        <Field label="Industry" htmlFor={field("industries")}>
          <FacetMultiSelect
            id={field("industries")}
            label="Industry"
            placeholder="Any industry"
            options={facets?.industries ?? EMPTY_FACET}
            loading={facetsLoading}
            selected={draft.industryIds.map(String)}
            onToggle={(value) =>
              patch((next) => {
                next.industryIds = toggleNumber(
                  next.industryIds,
                  Number(value)
                );
              })
            }
            onClear={() =>
              patch((next) => {
                next.industryIds = [];
              })
            }
          />
        </Field>
      </FilterGroup>

      <FilterGroup
        title="Location"
        activeCount={draft.countries.length + (draft.location ? 1 : 0)}
      >
        <Field label="Country" htmlFor={field("countries")}>
          <FacetMultiSelect
            id={field("countries")}
            label="Country"
            placeholder="Any country"
            options={facets?.countries ?? EMPTY_FACET}
            loading={facetsLoading}
            selected={draft.countries}
            onToggle={(value) =>
              patch((next) => {
                next.countries = toggleString(next.countries, value);
              })
            }
            onClear={() =>
              patch((next) => {
                next.countries = [];
              })
            }
          />
        </Field>
        <Field label="City / state" htmlFor={field("location")}>
          <Input
            id={field("location")}
            value={draft.location ?? ""}
            placeholder="e.g. Mumbai"
            onChange={(event) =>
              patch((next) => {
                next.location = event.target.value.trim()
                  ? event.target.value
                  : null;
              })
            }
            className="h-9 text-sm"
          />
        </Field>
      </FilterGroup>
    </>
  );
}
