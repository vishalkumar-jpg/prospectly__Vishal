import { useId } from "react";
import { IdentityFilterFields } from "./IdentityFilterFields";
import { ProfileFilterFields } from "./ProfileFilterFields";
import type { FilterFieldsProps } from "./filter-fields.shared";

export function FilterFields({
  draft,
  facets,
  facetsLoading,
  patch,
}: FilterFieldsProps) {
  const ids = useId();
  const field = (name: string) => `${ids}-${name}`;
  const section = { draft, facets, facetsLoading, patch, field };

  return (
    <>
      <IdentityFilterFields {...section} />
      <ProfileFilterFields {...section} />
    </>
  );
}
