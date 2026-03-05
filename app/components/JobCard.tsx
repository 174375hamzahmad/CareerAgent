"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Job } from "../types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Wifi, GripVertical, CalendarDays, Paperclip } from "lucide-react";

export default function JobCard({
  job,
  onClick,
  isDraggingOverlay = false,
}: {
  job: Job;
  onClick: () => void;
  isDraggingOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: job.id });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="w-full overflow-hidden">
      <Card
        onClick={onClick}
        className={`p-3.5 cursor-pointer group transition-all select-none hover:shadow-md hover:-translate-y-0.5 w-full min-w-0 ${
          isDragging ? "opacity-40 shadow-lg" : ""
        } ${isDraggingOverlay ? "shadow-2xl rotate-1 scale-105" : ""}`}
      >
        {/* Drag handle + header */}
        <div className="flex items-start gap-2">
          <div
            {...listeners}
            className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{job.company}</p>
                <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2 leading-snug">{job.role}</p>
              </div>
              {job.remote && (
                <Badge variant="secondary" className="shrink-0 text-xs gap-1 px-1.5">
                  <Wifi className="w-2.5 h-2.5" /> Remote
                </Badge>
              )}
            </div>

            {(() => {
              const salary = job.salary && job.salary !== "null" ? job.salary : null;
              const location = job.location && job.location !== "null" ? job.location : null;
              if (!salary && !location) return null;
              return (
                <div className="flex items-center gap-2 mt-2">
                  {salary && (
                    <span className="flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <DollarSign className="w-3 h-3" />{salary.replace(/^\$/, "")}
                    </span>
                  )}
                  {location && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />{location}
                    </span>
                  )}
                </div>
              );
            })()}

            {job.requirements.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {job.requirements.slice(0, 3).map((req) => (
                  <Badge key={req} variant="outline" className="text-xs px-1.5 py-0 h-5 font-normal max-w-[110px] truncate block">
                    {req}
                  </Badge>
                ))}
                {job.requirements.length > 3 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{job.requirements.length - 3}
                  </span>
                )}
              </div>
            )}

            {(job.appliedAt || job.resumeId) && (
              <div className="flex items-center justify-between mt-2.5">
                {job.appliedAt && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="w-3 h-3" />
                    Applied {new Date(job.appliedAt).toLocaleDateString()}
                  </div>
                )}
                {job.resumeId && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto" title={job.resume?.name}>
                    <Paperclip className="w-3 h-3" />
                    {job.resume?.name ?? "Resume"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
