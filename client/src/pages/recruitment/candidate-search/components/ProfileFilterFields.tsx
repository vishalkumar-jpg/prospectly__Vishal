import { AppliedOnField } from "./AppliedOnField";
import { ChipSet, Field } from "./FilterFieldControls";
import { FilterGroup } from "./FilterGroup";
import { RangeField } from "./RangeField";
import { FacetMultiSelect } from "./FacetMultiSelect";
import {
  EMPTY_FACET,
  EXPERIENCE_MAX,
  SCORE_MAX,
  toggleNumber,
  toggleString,
  type FilterSectionProps,
} from "./filter-fields.shared";

export function ProfileFilterFields({
  draft,
  facets,
  facetsLoading,
  patch,
  field,
}: FilterSectionProps) {
  const rangeGroupCount =
    (draft.experienceMin !== null || draft.experienceMax !== null ? 1 : 0) +
    (draft.scoreMin !== null || draft.scoreMax !== null ? 1 : 0);

  return (
    <>
      <FilterGroup title="Experience & match" activeCount={rangeGroupCount}>
        <RangeField
          label="Years of experience"
          min={0}
          max={EXPERIENCE_MAX}
          step={1}
          from={draft.experienceMin}
          to={draft.experienceMax}
          format={(value) =>
            value >= EXPERIENCE_MAX ? `${EXPERIENCE_MAX}+ yrs` : `${value} yrs`
          }
          onChange={(from, to) =>
            patch((next) => {
              next.experienceMin = from;
              next.experienceMax = to;
            })
          }
        />
        <RangeField
          label="Match score"
          min={0}
          max={SCORE_MAX}
          step={5}
          from={draft.scoreMin}
          to={draft.scoreMax}
          format={(value) => `${value}%`}
          onChange={(from, to) =>
            patch((next) => {
              next.scoreMin = from;
              next.scoreMax = to;
            })
          }
        />
      </FilterGroup>

      <FilterGroup
        title="Candidate profile"
        activeCount={
          draft.employmentTypes.length +
          draft.workModes.length +
          draft.stageIds.length
        }
      >
        <Field label="Employment type">
          <ChipSet
            label="Employment type"
            options={facets?.employmentTypes ?? EMPTY_FACET}
            selected={draft.employmentTypes}
            onToggle={(value) =>
              patch((next) => {
                next.employmentTypes = toggleString(
                  next.employmentTypes,
                  value
                );
              })
            }
          />
        </Field>
        <Field label="Work mode">
          <ChipSet
            label="Work mode"
            options={facets?.workModes ?? EMPTY_FACET}
            selected={draft.workModes}
            onToggle={(value) =>
              patch((next) => {
                next.workModes = toggleString(next.workModes, value);
              })
            }
          />
        </Field>
        <Field label="Pipeline stage" htmlFor={field("stages")}>
          <FacetMultiSelect
            id={field("stages")}
            label="Pipeline stage"
            placeholder="Any status"
            options={facets?.stages ?? EMPTY_FACET}
            loading={facetsLoading}
            selected={draft.stageIds.map(String)}
            onToggle={(value) =>
              patch((next) => {
                next.stageIds = toggleNumber(next.stageIds, Number(value));
              })
            }
          />
        </Field>
      </FilterGroup>

      <FilterGroup
        title="Background & history"
        activeCount={
          draft.educationLevels.length +
          draft.sources.length +
          (draft.appliedFrom ? 1 : 0) +
          (draft.appliedTo ? 1 : 0)
        }
      >
        <Field label="Education" htmlFor={field("education")}>
          <FacetMultiSelect
            id={field("education")}
            label="Education"
            placeholder="Any education"
            options={facets?.educationLevels ?? EMPTY_FACET}
            loading={facetsLoading}
            selected={draft.educationLevels}
            onToggle={(value) =>
              patch((next) => {
                next.educationLevels = toggleString(
                  next.educationLevels,
                  value
                );
              })
            }
            onClear={() =>
              patch((next) => {
                next.educationLevels = [];
              })
            }
          />
        </Field>
        <Field label="Source / applied via" htmlFor={field("sources")}>
          <FacetMultiSelect
            id={field("sources")}
            label="Source"
            placeholder="Any source"
            options={facets?.sources ?? EMPTY_FACET}
            loading={facetsLoading}
            selected={draft.sources}
            onToggle={(value) =>
              patch((next) => {
                next.sources = toggleString(next.sources, value);
              })
            }
            onClear={() =>
              patch((next) => {
                next.sources = [];
              })
            }
          />
        </Field>
        <Field label="Applied on">
          <AppliedOnField
            from={draft.appliedFrom}
            to={draft.appliedTo}
            onChange={(from, to) =>
              patch((next) => {
                next.appliedFrom = from;
                next.appliedTo = to;
              })
            }
          />
        </Field>
      </FilterGroup>
    </>
  );
}
