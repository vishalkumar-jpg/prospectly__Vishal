import { CreateDisputeFormFields } from "./CreateDisputeFormFields";
import { CreateDisputeFormTextarea } from "./CreateDisputeFormTextarea";

export function CreateDisputeForm() {
  return (
    <div className="space-y-6 pt-4">
      <CreateDisputeFormFields />
      <CreateDisputeFormTextarea />
    </div>
  );
}
