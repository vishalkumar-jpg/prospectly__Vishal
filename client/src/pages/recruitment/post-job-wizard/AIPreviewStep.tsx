import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, X } from "lucide-react";
import {
  useIndustries,
  useDepartments,
} from "@/hooks/useRecruitmentMasterData";
import { JobDetailsMetadataFields } from "./components/JobDetailsMetadataFields";
import { JobDetailsSalaryFields } from "./components/JobDetailsSalaryFields";
import type { JobFormData, UpdateJobFormData } from "./types";

interface AIPreviewStepProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
}

export default function AIPreviewStep({
  formData,
  updateFormData,
}: AIPreviewStepProps) {
  const { industries } = useIndustries();
  const { departments } = useDepartments();

  const handleSkillRemove = (skill: string) => {
    updateFormData({
      requiredSkills: formData.requiredSkills.filter((s) => s !== skill),
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-left mb-4 sm:mb-6 lg:mb-8">
        <h2 className="text-2xl font-bold text-slate-900">
          AI Extracted Details
        </h2>
        <p className="text-slate-600 mt-2">
          Review and edit the extracted information before continuing
        </p>
      </div>

      <div className="max-w-3xl space-y-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">
              AI has extracted the following details. You can edit any field
              before proceeding.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => updateFormData({ title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.companyName}
                  onChange={(e) =>
                    updateFormData({ companyName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(v) => updateFormData({ industry: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={(v) => updateFormData({ department: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <JobDetailsMetadataFields
              formData={formData}
              updateFormData={updateFormData}
            />

            <JobDetailsSalaryFields
              formData={formData}
              updateFormData={updateFormData}
            />

            <div className="space-y-2">
              <Label>Extracted Skills</Label>
              <div className="flex flex-wrap gap-2">
                {formData.requiredSkills.map((skill) => (
                  <Badge
                    key={skill}
                    className="bg-teal-100 text-teal-700 hover:bg-teal-200 cursor-pointer"
                    onClick={() => handleSkillRemove(skill)}
                  >
                    {skill} <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
