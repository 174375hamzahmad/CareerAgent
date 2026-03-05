"use client";

import { useState } from "react";
import { Job } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import ResumePicker from "./ResumePicker";
import ResumeManager from "./ResumeManager";

interface FormData {
  company: string;
  role: string;
  salary: string;
  location: string;
  remote: boolean;
  url: string;
  requirements: string;
  notes: string;
}

const EMPTY: FormData = {
  company: "", role: "", salary: "", location: "",
  remote: false, url: "", requirements: "", notes: "",
};

function FormFields({ form, set }: { form: FormData; set: (f: Partial<FormData>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Company <span className="text-destructive">*</span></Label>
          <Input value={form.company} onChange={(e) => set({ company: e.target.value })} placeholder="Stripe" />
        </div>
        <div className="space-y-1.5">
          <Label>Role <span className="text-destructive">*</span></Label>
          <Input value={form.role} onChange={(e) => set({ role: e.target.value })} placeholder="Senior Engineer" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Salary</Label>
          <Input value={form.salary} onChange={(e) => set({ salary: e.target.value })} placeholder="$120k–$150k" />
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="New York, NY" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Job URL</Label>
        <Input value={form.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://..." />
      </div>
      <div className="space-y-1.5">
        <Label>Requirements <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
        <Input value={form.requirements} onChange={(e) => set({ requirements: e.target.value })} placeholder="React, TypeScript, Node.js" />
        {form.requirements && (
          <div className="flex flex-wrap gap-1 pt-1">
            {form.requirements.split(",").filter((r) => r.trim()).map((r) => (
              <Badge key={r} variant="secondary" className="text-xs">{r.trim()}</Badge>
            ))}
          </div>
        )}
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.remote} onChange={(e) => set({ remote: e.target.checked })} className="rounded" />
        <span className="text-sm">Remote / Hybrid</span>
      </label>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} className="resize-none" placeholder="Anything to remember..." />
      </div>
    </div>
  );
}

export default function AddJobModal({ onClose, onAdded }: { onClose: () => void; onAdded: (job: Job) => void }) {
  const [tab, setTab] = useState<"ai" | "manual">("ai");
  const [input, setInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [showResumeManager, setShowResumeManager] = useState(false);
  const [resumeRefresh, setResumeRefresh] = useState(0);

  function set(field: Partial<FormData>) {
    setForm((f) => ({ ...f, ...field }));
  }

  function handleTabChange(value: string) {
    setTab(value as "ai" | "manual");
    setExtracted(false);
    setForm(EMPTY);
    setExtractError("");
    setInput("");
  }

  async function handleExtract() {
    if (!input.trim()) return;
    setExtracting(true);
    setExtractError("");
    const isUrl = input.trim().startsWith("http");
    const res = await fetch("/api/jobs/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isUrl ? { url: input.trim() } : { text: input.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setExtractError(data.error ?? "Extraction failed. Try pasting the text instead.");
      setExtracting(false);
      return;
    }
    const data = await res.json();
    setForm({
      company: data.company ?? "",
      role: data.role ?? "",
      salary: data.salary ?? "",
      location: data.location ?? "",
      remote: data.remote ?? false,
      url: data.url ?? (isUrl ? input.trim() : ""),
      requirements: (data.requirements ?? []).join(", "),
      notes: "",
    });
    setExtracted(true);
    setExtracting(false);
  }

  async function handleSave() {
    if (!form.company || !form.role) return;
    setSaving(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        salary: form.salary || null,
        location: form.location || null,
        url: form.url || null,
        notes: form.notes || null,
        requirements: form.requirements
          ? form.requirements.split(",").map((r) => r.trim()).filter(Boolean)
          : [],
        resumeId: resumeId ?? null,
      }),
    });
    if (res.ok) {
      const job = await res.json();
      onAdded(job);
    }
    setSaving(false);
  }

  const showForm = tab === "manual" || extracted;

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Add Job</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabsList className="w-full mb-5">
                <TabsTrigger value="ai" className="flex-1">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Extract with AI
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1">Fill manually</TabsTrigger>
              </TabsList>

              <TabsContent value="ai" className="mt-0 space-y-4">
                {!extracted ? (
                  <>
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Paste a job URL or the full job description..."
                      rows={6}
                      className="resize-none"
                    />
                    {extractError && <p className="text-sm text-destructive">{extractError}</p>}
                    <Button onClick={handleExtract} disabled={!input.trim() || extracting} className="w-full">
                      {extracting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extracting...</>
                        : <><Sparkles className="w-4 h-4 mr-2" />Extract with AI</>}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-lg">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      AI extracted the details — review before saving.
                    </div>
                    <FormFields form={form} set={set} />
                  </>
                )}
              </TabsContent>

              <TabsContent value="manual" className="mt-0">
                <FormFields form={form} set={set} />
              </TabsContent>
            </Tabs>

            {showForm && (
              <div className="mt-4 space-y-1.5">
                <Label>Resume used <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <ResumePicker
                  value={resumeId}
                  onChange={setResumeId}
                  onManage={() => setShowResumeManager(true)}
                  refreshTrigger={resumeRefresh}
                />
              </div>
            )}
          </div>

          {showForm && (
            <div className="flex gap-3 px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!form.company || !form.role || saving}
                className="flex-1"
              >
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Job"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ResumeManager
        open={showResumeManager}
        onClose={() => setShowResumeManager(false)}
        onResumesChanged={() => setResumeRefresh((n) => n + 1)}
      />
    </>
  );
}
