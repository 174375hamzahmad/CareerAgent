"use client";

import { useEffect, useState } from "react";
import { Resume } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Settings2 } from "lucide-react";

export default function ResumePicker({
  value,
  onChange,
  onManage,
  refreshTrigger,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  onManage?: () => void;
  refreshTrigger?: number;
}) {
  const [resumes, setResumes] = useState<Resume[]>([]);

  useEffect(() => {
    fetch("/api/resumes")
      .then((r) => (r.ok ? r.json() : []))
      .then(setResumes)
      .catch(() => {});
  }, [refreshTrigger]);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value ?? "none"}
        onValueChange={(v) => onChange(v === "none" ? null : v)}
      >
        <SelectTrigger className="flex-1 h-9">
          <SelectValue placeholder="No resume selected" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">No resume</span>
          </SelectItem>
          {resumes.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                {r.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {onManage && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onManage}
          title="Manage resumes"
        >
          <Settings2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
