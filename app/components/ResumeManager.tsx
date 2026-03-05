"use client";

import { useEffect, useRef, useState } from "react";
import { Resume } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, ExternalLink, FileText } from "lucide-react";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResumeManager({
  open,
  onClose,
  onResumesChanged,
}: {
  open: boolean;
  onClose: () => void;
  onResumesChanged?: () => void;
}) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/resumes");
      if (res.ok) setResumes(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!file || !name.trim()) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name.trim());
    const res = await fetch("/api/resumes", { method: "POST", body: fd });
    if (res.ok) {
      toast.success("Resume uploaded");
      setName("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
      onResumesChanged?.();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Upload failed");
    }
    setUploading(false);
  }

  async function handleDelete(resume: Resume) {
    if (!confirm(`Delete "${resume.name}"?`)) return;
    setDeletingId(resume.id);
    const res = await fetch(`/api/resumes/${resume.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Resume deleted");
      setResumes((prev) => prev.filter((r) => r.id !== resume.id));
      onResumesChanged?.();
    } else {
      toast.error("Failed to delete");
    }
    setDeletingId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resume Library</DialogTitle>
        </DialogHeader>

        {/* Upload form */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Resume name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend Dev Resume v2"
            />
          </div>
          <div className="space-y-1.5">
            <Label>File <span className="text-muted-foreground text-xs">(PDF or DOCX)</span></Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer"
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={!file || !name.trim() || uploading}
            className="w-full gap-2"
          >
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</>
              : <><Upload className="w-4 h-4" />Upload Resume</>}
          </Button>
        </div>

        {resumes.length > 0 && <Separator />}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {resumes.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(r.fileSize)}{r.fileSize ? " · " : ""}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <a href={r.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 hover:text-destructive"
                  onClick={() => handleDelete(r)}
                  disabled={deletingId === r.id}
                >
                  {deletingId === r.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
