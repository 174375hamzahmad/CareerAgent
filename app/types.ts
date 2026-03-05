export type Status = "SAVED" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED";

export interface Resume {
  id: string;
  userId: string;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobEvent {
  id: string;
  jobId: string;
  type: string;
  note: string | null;
  date: string;
}

export interface Job {
  id: string;
  userId: string;
  company: string;
  role: string;
  salary: string | null;
  location: string | null;
  remote: boolean;
  url: string | null;
  description: string | null;
  requirements: string[];
  status: Status;
  appliedAt: string | null;
  followUpAt: string | null;
  followUpSent: boolean;
  notes: string | null;
  recruiter: string | null;
  recruiterEmail: string | null;
  interviewPrep: string | null;
  resumeId: string | null;
  resume: Resume | null;
  events: JobEvent[];
  createdAt: string;
  updatedAt: string;
}
