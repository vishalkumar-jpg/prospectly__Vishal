import { CreateDisputeFormSelects } from "./CreateDisputeFormSelects";
import { CreateDisputeFormAmounts } from "./CreateDisputeFormAmounts";

export function CreateDisputeFormFields() {
  return (
    <>
      <CreateDisputeFormSelects />
      <CreateDisputeFormAmounts />
    </>
  );
}
