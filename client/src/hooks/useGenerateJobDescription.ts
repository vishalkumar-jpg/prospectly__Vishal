import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recruitmentApi } from "@/lib/api/recruitment";
import { toast } from "@/hooks/use-toast";
import type {
  JobFormData,
  UpdateJobFormData,
} from "@/pages/recruitment/post-job-wizard/types";
import { plainTextToHtml } from "@/lib/rich-text";

interface GenerateJobDescriptionParams {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  onClearError?: (field: string) => void;
  industries?: Array<{ id: number; name: string }>;
  departments?: Array<{ id: number; name: string }>;
}

export const useGenerateJobDescription = ({
  formData,
  updateFormData,
  onClearError,
  industries,
  departments,
}: GenerateJobDescriptionParams) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      // Look up industry and department names
      const industry = industries?.find(
        (i) => String(i.id) === formData.industry
      );
      const department = departments?.find(
        (d) => String(d.id) === formData.department
      );

      return recruitmentApi.generateJobDescription({
        title: formData.title,
        industryName: industry?.name,
        departmentName: department?.name,
        experienceLevel: formData.experienceLevel,
        workType: formData.workType,
        location: formData.location,
        requiredSkills: formData.requiredSkills,
        preferredSkills: formData.preferredSkills,
      });
    },
    onSuccess: (data) => {
      // The AI returns plain text with `\n` + `•` bullets — convert to HTML
      // so it loads into the rich-text editor as real paragraphs and lists.
      const updates = {
        description: plainTextToHtml(data.description),
        requirements: plainTextToHtml(data.requirements),
        responsibilities: plainTextToHtml(data.responsibilities),
        benefits: plainTextToHtml(data.benefits),
      };

      updateFormData(updates);

      // Clear any existing errors since AI-generated content meets minimums
      onClearError?.("description");
      onClearError?.("requirements");
      onClearError?.("responsibilities");
      onClearError?.("benefits");

      toast.success("Description generated", {
        description: "Review and edit the AI-generated content.",
      });
    },
    onError: (error) => {
      console.error("Error generating description:", error);
      toast.error("Generation failed", {
        description: "Failed to generate description. Please try again.",
      });
    },
  });
};
