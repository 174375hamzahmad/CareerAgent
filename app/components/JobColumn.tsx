"use client";

import { useDroppable } from "@dnd-kit/core";
import { Job, Status } from "../types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import JobCard from "./JobCard";
import { Inbox } from "lucide-react";

const COLUMN_META: Record<Status, { label: string; accent: string; bg: string; badge: string }> = {
  SAVED:     { label: "Saved",     accent: "border-t-slate-400",   bg: "bg-muted/40",          badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  APPLIED:   { label: "Applied",   accent: "border-t-blue-500",    bg: "bg-blue-50/50 dark:bg-blue-950/20",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  INTERVIEW: { label: "Interview", accent: "border-t-amber-500",   bg: "bg-amber-50/50 dark:bg-amber-950/20",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  OFFER:     { label: "Offer",     accent: "border-t-emerald-500", bg: "bg-emerald-50/50 dark:bg-emerald-950/20", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
  REJECTED:  { label: "Rejected",  accent: "border-t-rose-500",   bg: "bg-rose-50/50 dark:bg-rose-950/20",    badge: "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300" },
};

export function JobColumnSkeleton({ status }: { status: Status }) {
  const meta = COLUMN_META[status];
  return (
    <div className="flex-shrink-0 w-72">
      <div className={`rounded-xl border border-t-4 ${meta.accent} ${meta.bg} p-3`}>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{meta.label}</span>
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      </div>
    </div>
  );
}

export default function JobColumn({
  status,
  jobs,
  onJobClick,
}: {
  status: Status;
  jobs: Job[];
  onJobClick: (job: Job) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = COLUMN_META[status];

  return (
    <div className="flex-shrink-0 w-72">
      <div
        className={`rounded-xl border border-t-4 ${meta.accent} transition-all ${meta.bg} ${
          isOver ? "ring-2 ring-primary ring-offset-2 shadow-lg" : ""
        }`}
      >
        {/* Column header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {meta.label}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
            {jobs.length}
          </span>
        </div>

        {/* Drop zone */}
        <div ref={setNodeRef} className="p-2 space-y-2 min-h-[120px]">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => onJobClick(job)} />
          ))}

          {jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
              <Inbox className="w-6 h-6 mb-1.5" />
              <p className="text-xs">Drop here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
