"use client";

import { useEffect, useState } from "react";
import { Job, Status } from "../types";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink, Sparkles, Loader2, Trash2, MapPin,
  DollarSign, Wifi, CalendarDays, User, Mail, Clock, Check, FileText,
  Bookmark, Send, Users, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ResumePicker from "./ResumePicker";
import ResumeManager from "./ResumeManager";

const PIPELINE: { value: Status; label: string; icon: typeof Bookmark }[] = [
  { value: "SAVED",     label: "Saved",     icon: Bookmark },
  { value: "APPLIED",   label: "Applied",   icon: Send },
  { value: "INTERVIEW", label: "Interview", icon: Users },
  { value: "OFFER",     label: "Offer",     icon: Trophy },
];
const PIPELINE_ORDER = ["SAVED", "APPLIED", "INTERVIEW", "OFFER"] as const;

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{children}</p>
);

export default function JobDetailPanel({
  job, onClose, onUpdated, onDeleted,
}: {
  job: Job;
  onClose: () => void;
  onUpdated: (job: Job) => void;
  onDeleted: (id: string) => void;
}) {
  const [notes, setNotes] = useState(job.notes ?? "");
  const [recruiter, setRecruiter] = useState(job.recruiter ?? "");
  const [recruiterEmail, setRecruiterEmail] = useState(job.recruiterEmail ?? "");
  const [followUpAt, setFollowUpAt] = useState(job.followUpAt ? job.followUpAt.split("T")[0] : "");
  const [saving, setSaving] = useState(false);

  // Sync editable fields when the job prop changes (e.g. after a status update returns fresh data)
  useEffect(() => {
    setNotes(job.notes ?? "");
    setRecruiter(job.recruiter ?? "");
    setRecruiterEmail(job.recruiterEmail ?? "");
    setFollowUpAt(job.followUpAt ? job.followUpAt.split("T")[0] : "");
  }, [job]);
  const [generatingPrep, setGeneratingPrep] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showResumeManager, setShowResumeManager] = useState(false);
  const [resumeRefresh, setResumeRefresh] = useState(0);

  async function patch(data: object) {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { onUpdated(await res.json()); return true; }
    return false;
  }

  async function handleStatusChange(status: Status) {
    const ok = await patch({ status, ...(status === "APPLIED" && !job.appliedAt ? { appliedAt: new Date().toISOString() } : {}) });
    if (ok) toast.success(`Status → ${status.toLowerCase()}`);
  }

  async function handleSaveDetails() {
    setSaving(true);
    const ok = await patch({
      notes: notes || null,
      recruiter: recruiter || null,
      recruiterEmail: recruiterEmail || null,
      followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null,
    });
    if (ok) toast.success("Changes saved");
    else toast.error("Failed to save");
    setSaving(false);
  }

  async function handleGeneratePrep() {
    setGeneratingPrep(true);
    const res = await fetch(`/api/jobs/${job.id}/prep`, { method: "POST" });
    if (res.ok) { onUpdated(await res.json()); toast.success("Interview prep generated"); }
    else toast.error("Failed to generate prep");
    setGeneratingPrep(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${job.role} at ${job.company}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(job.id);
    else { toast.error("Failed to delete"); setDeleting(false); }
  }

  return (
    <>
    <ResumeManager
      open={showResumeManager}
      onClose={() => setShowResumeManager(false)}
      onResumesChanged={() => setResumeRefresh((n) => n + 1)}
    />
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0 h-screen">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-left">
            <span className="block text-base font-bold leading-snug">{job.role}</span>
            <span className="block text-sm font-normal text-muted-foreground mt-0.5">{job.company}</span>
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {job.salary && job.salary !== "null" && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <DollarSign className="w-3.5 h-3.5" />{job.salary.replace(/^\$/, "")}
              </span>
            )}
            {job.location && job.location !== "null" && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />{job.location}
              </span>
            )}
            {job.remote && (
              <Badge variant="secondary" className="gap-1">
                <Wifi className="w-3 h-3" />Remote
              </Badge>
            )}
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer">
                <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                  <ExternalLink className="w-3 h-3" />View posting
                </Badge>
              </a>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-6 py-5 space-y-6">
            {/* Status pipeline */}
            <div>
              <SectionLabel>Pipeline</SectionLabel>

              {(() => {
                const isRejected = job.status === "REJECTED";
                const stepIndex = PIPELINE_ORDER.indexOf(job.status as typeof PIPELINE_ORDER[number]);

                return (
                  <>
                    {isRejected && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          Rejected
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStatusChange("APPLIED")}
                          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                        >
                          Reopen application
                        </button>
                      </div>
                    )}

                    {/* Stepper */}
                    <div className="relative grid grid-cols-4 py-1">
                      {/* Track */}
                      <div className="absolute top-[calc(50%-8px)] left-[12.5%] right-[12.5%] h-[2px] bg-muted-foreground/10 rounded-full" />
                      {/* Progress fill */}
                      {!isRejected && stepIndex > 0 && (
                        <div
                          className="absolute top-[calc(50%-8px)] left-[12.5%] h-[2px] bg-primary rounded-full transition-[width] duration-500 ease-out"
                          style={{ width: `${stepIndex * 25}%` }}
                        />
                      )}

                      {PIPELINE.map((step, index) => {
                        const Icon = step.icon;
                        const isCompleted = !isRejected && stepIndex > index;
                        const isCurrent = !isRejected && stepIndex === index;
                        const isFuture = !isRejected && stepIndex < index;
                        return (
                          <button
                            key={step.value}
                            type="button"
                            disabled={isCurrent}
                            onClick={() => handleStatusChange(step.value)}
                            className="flex flex-col items-center gap-2 disabled:cursor-default group relative"
                          >
                            <div className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
                              isCompleted && "bg-primary text-primary-foreground shadow-sm",
                              isCurrent && "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-[3px] ring-primary/20",
                              isFuture && "bg-muted border border-border text-muted-foreground group-hover:border-primary/50 group-hover:text-primary group-hover:bg-primary/5 group-hover:scale-110",
                              isRejected && "bg-muted/50 border border-border/50 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:border-border group-hover:scale-110",
                            )}>
                              {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                            </div>
                            <span className={cn(
                              "text-[11px] leading-none transition-colors",
                              isCurrent && "font-semibold text-foreground",
                              isCompleted && "font-medium text-primary",
                              isFuture && "text-muted-foreground group-hover:text-foreground",
                              isRejected && "text-muted-foreground/40",
                            )}>
                              {step.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {!isRejected && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("REJECTED")}
                        className="mt-3 text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 underline-offset-2 hover:underline transition-colors"
                      >
                        Mark as rejected
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            <Separator />

            {/* Resume */}
            <div>
              <SectionLabel>Resume used</SectionLabel>
              {job.resume && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-md bg-muted/40 border">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1 truncate">{job.resume.name}</span>
                  <a href={job.resume.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">
                    View
                  </a>
                </div>
              )}
              <ResumePicker
                value={job.resumeId}
                onChange={(id) => patch({ resumeId: id })}
                onManage={() => setShowResumeManager(true)}
                refreshTrigger={resumeRefresh}
              />
            </div>

            <Separator />

            {/* Requirements */}
            {job.requirements.length > 0 && (
              <div>
                <SectionLabel>Requirements</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {job.requirements.map((req) => (
                    <Badge key={req} variant="secondary" className="font-normal">{req}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div>
                <SectionLabel>Description</SectionLabel>
                <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>
              </div>
            )}

            <Separator />

            {/* Interview Prep */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <SectionLabel>Interview Prep</SectionLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGeneratePrep}
                  disabled={generatingPrep}
                  className="h-7 text-xs gap-1"
                >
                  {generatingPrep
                    ? <><Loader2 className="w-3 h-3 animate-spin" />Generating...</>
                    : <><Sparkles className="w-3 h-3" />{job.interviewPrep ? "Regenerate" : "Generate with AI"}</>}
                </Button>
              </div>
              {job.interviewPrep ? (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed border">
                  {job.interviewPrep}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Click &ldquo;Generate with AI&rdquo; to get tailored interview prep for this role.
                </p>
              )}
            </div>

            <Separator />

            {/* Details */}
            <div className="space-y-4">
              <SectionLabel>Details</SectionLabel>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="resize-none" placeholder="Personal notes..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><User className="w-3 h-3" />Recruiter</Label>
                  <Input value={recruiter} onChange={(e) => setRecruiter(e.target.value)} placeholder="Name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Mail className="w-3 h-3" />Email</Label>
                  <Input value={recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} placeholder="email@co.com" type="email" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Clock className="w-3 h-3" />Follow-up reminder</Label>
                <Input value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} type="date" className="w-fit" />
              </div>
              <Button type="button" onClick={handleSaveDetails} disabled={saving} className="w-full">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save changes"}
              </Button>
            </div>

            {/* Timeline */}
            {job.events.length > 0 && (
              <>
                <Separator />
                <div>
                  <SectionLabel>Timeline</SectionLabel>
                  <div className="space-y-3">
                    {job.events.map((event) => (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {event.type.replace(/_/g, " ")}
                            {event.note && <span className="font-normal text-muted-foreground"> — {event.note}</span>}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <CalendarDays className="w-3 h-3" />
                            {new Date(event.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>


        {/* Footer */}
        <div className="px-6 py-4 border-t">
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="w-full gap-2">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? "Deleting..." : "Delete job"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
