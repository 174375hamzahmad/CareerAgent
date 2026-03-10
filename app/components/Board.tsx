"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { UserButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { Job, Status } from "../types";
import JobColumn, { JobColumnSkeleton } from "./JobColumn";
import JobCard from "./JobCard";
import AddJobModal from "./AddJobModal";
import JobDetailPanel from "./JobDetailPanel";
import ChatPanel from "./ChatPanel";
import ResumeManager from "./ResumeManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, SlidersHorizontal, MessageSquare, TrendingUp, Briefcase, CalendarCheck, Award, Moon, Sun, FileText } from "lucide-react";

const STATUSES: Status[] = ["APPLIED", "FOLLOWED_UP", "INTERVIEW", "OFFER", "REJECTED"];

type DateFilter = "all" | "week" | "month";
type SortBy = "newest" | "oldest" | "company";

function isWithin(dateStr: string | null, filter: DateFilter): boolean {
  if (filter === "all" || !dateStr) return true;
  const date = new Date(dateStr);
  const now = new Date();
  const days = filter === "week" ? 7 : 30;
  return (now.getTime() - date.getTime()) <= days * 24 * 60 * 60 * 1000;
}

export default function Board() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showResumeManager, setShowResumeManager] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error();
      setJobs(await res.json());
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Derived + filtered jobs
  const filtered = useMemo(() => {
    let result = jobs.filter((j) => {
      const q = search.toLowerCase();
      if (q && !j.company.toLowerCase().includes(q) && !j.role.toLowerCase().includes(q)) return false;
      if (!isWithin(j.createdAt, dateFilter)) return false;
      return true;
    });
    if (sortBy === "newest") result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sortBy === "oldest") result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (sortBy === "company") result = [...result].sort((a, b) => a.company.localeCompare(b.company));
    return result;
  }, [jobs, search, dateFilter, sortBy]);

  const byStatus = useMemo(() =>
    Object.fromEntries(STATUSES.map((s) => [s, filtered.filter((j) => j.status === s)])) as Record<Status, Job[]>,
    [filtered]
  );

  // Stats
  const stats = useMemo(() => {
    const applied = jobs.filter((j) => j.status === "APPLIED").length;
    const interviews = jobs.filter((j) => ["INTERVIEW", "OFFER"].includes(j.status)).length;
    const offers = jobs.filter((j) => j.status === "OFFER").length;
    const offerRate = applied > 0 ? Math.round((offers / applied) * 100) : 0;
    return { total: jobs.length, applied, interviews, offerRate };
  }, [jobs]);

  function handleDragStart(e: DragStartEvent) {
    setActiveJob(jobs.find((j) => j.id === e.active.id) ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveJob(null);
    const { active, over } = e;
    if (!over) return;
    const jobId = active.id as string;
    const newStatus = over.id as Status;
    if (!STATUSES.includes(newStatus)) return;
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === newStatus) return;

    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: newStatus } : j));
    const body: Record<string, unknown> = { status: newStatus };
    if (newStatus === "FOLLOWED_UP" && !job.appliedAt) body.appliedAt = new Date().toISOString();

    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) toast.success(`Moved to ${newStatus.toLowerCase()}`);
    else toast.error("Failed to update status");
  }

  const dateFilterLabel = { all: "All time", week: "Past week", month: "Past month" }[dateFilter];
  const sortLabel = { newest: "Newest first", oldest: "Oldest first", company: "Company A–Z" }[sortBy];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-2.5 flex flex-wrap items-center gap-2 lg:gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0 mr-1">
            <Briefcase className="w-5 h-5 text-primary" />
            <h1 className="text-base lg:text-lg font-bold">CareerAgent</h1>
          </div>

          {/* Search — full width on wrap, constrained on wide screens */}
          <div className="relative order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or role..."
              className="pl-8 h-8 text-sm w-full"
            />
          </div>

          {/* Date filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{dateFilterLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuRadioGroup value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <DropdownMenuRadioItem value="all">All time</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="week">Past week</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="month">Past month</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs hidden sm:flex">
                <span className="hidden lg:inline">{sortLabel}</span>
                <span className="lg:hidden">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="company">Company A–Z</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1.5 ml-auto">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs hidden md:flex" onClick={() => setShowResumeManager(true)}>
              <FileText className="w-3.5 h-3.5" /><span className="hidden lg:inline">Resumes</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs hidden md:flex" onClick={() => setShowChat(true)}>
              <MessageSquare className="w-3.5 h-3.5" /><span className="hidden lg:inline">AI Chat</span>
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowAddModal(true)}>
              <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add Job</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {mounted && (resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />)}
            </Button>
            <div suppressHydrationWarning><UserButton /></div>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      {!loading && jobs.length > 0 && (
        <div className="border-b bg-muted/30 overflow-x-auto">
          <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-2 flex items-center gap-4 lg:gap-6 min-w-max">
            {[
              { icon: Briefcase, label: "Total", value: stats.total, color: "text-foreground" },
              { icon: CalendarCheck, label: "Applied", value: stats.applied, color: "text-blue-600 dark:text-blue-400" },
              { icon: TrendingUp, label: "Interviews", value: stats.interviews, color: "text-amber-600 dark:text-amber-400" },
              { icon: Award, label: "Offer rate", value: `${stats.offerRate}%`, color: "text-emerald-600 dark:text-emerald-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}:</span>
                <span className={`text-xs font-semibold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board */}
      <main className="flex-1 p-4 lg:p-6 overflow-x-auto">
        {loading ? (
          <div className="flex gap-4">
            {STATUSES.map((s) => <JobColumnSkeleton key={s} status={s} />)}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 min-w-max pb-4">
              {STATUSES.map((s) => (
                <JobColumn key={s} status={s} jobs={byStatus[s]} onJobClick={setSelectedJob} />
              ))}
            </div>
            <DragOverlay>
              {activeJob ? <JobCard job={activeJob} onClick={() => {}} isDraggingOverlay /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onAdded={(job) => {
            setJobs((prev) => [job, ...prev]);
            setShowAddModal(false);
            toast.success(`${job.company} — ${job.role} added`);
          }}
        />
      )}

      {selectedJob && (
        <JobDetailPanel
          key={selectedJob.id}
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdated={(updated) => {
            setJobs((prev) => prev.map((j) => j.id === updated.id ? updated : j));
            setSelectedJob(updated);
          }}
          onDeleted={(id) => {
            setJobs((prev) => prev.filter((j) => j.id !== id));
            setSelectedJob(null);
            toast.success("Job deleted");
          }}
        />
      )}

      {showChat && <ChatPanel onClose={() => setShowChat(false)} />}

      <ResumeManager open={showResumeManager} onClose={() => setShowResumeManager(false)} />
    </div>
  );
}
