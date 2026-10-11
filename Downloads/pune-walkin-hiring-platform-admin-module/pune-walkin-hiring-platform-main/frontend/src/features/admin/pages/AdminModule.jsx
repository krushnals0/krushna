import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { INITIAL_DEMO_USERS } from "../../auth/services/authService";
import { storageService } from "../../../services/storageService";
import { useToast } from "../../../context/ToastContext";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import {
  DashboardIcon, BuildingIcon, BriefcaseIcon, CalendarIcon, UsersIcon,
  ClipboardListIcon, ChartBarIcon, ClockIcon, ShieldCheckIcon, MailIcon,
  SearchIcon, CheckCircleIcon, FileTextIcon, MapPinIcon,
} from "../../../components/common/Icons";

const KEYS = {
  companies: "punewalkin_admin_companies",
  users: "punewalkin_admin_users",
  activities: "punewalkin_admin_activity",
  notifications: "punewalkin_admin_notifications",
  preferences: "punewalkin_admin_preferences",
};
const read = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* demo storage */ }
};
const today = () => new Date().toISOString().slice(0, 10);
const initialCompanies = () => {
  const profile = storageService.getCompany() || {};
  const employers = read("punewalkin_auth_users", INITIAL_DEMO_USERS).filter(u => u.role === "EMPLOYER");
  const existing = read(KEYS.companies, null);
  if (existing) return existing;
  const records = employers.map((u, i) => ({
    id: u.companyId || profile.id || `company-${u.id}`,
    name: u.companyName || profile.name || "Company profile pending",
    employerName: u.name,
    employerId: u.id,
    email: u.email,
    phone: u.phone || profile.phone || "",
    industry: profile.industry || "Technology",
    website: u.website || profile.website || "",
    description: profile.description || "",
    address: profile.address || profile.city || "",
    createdAt: u.createdAt || today(),
    verificationStatus: u.status === "VERIFIED" ? "VERIFIED" : (i === 0 && profile.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING"),
    rejectionReason: "",
  }));
  if (!records.length && profile.name) records.push({
    id: profile.id || "company-profile-01", name: profile.name, employerName: "Employer contact",
    email: profile.email || "", industry: profile.industry || "Not provided",
    createdAt: profile.createdAt || today(),
    verificationStatus: profile.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING",
    rejectionReason: "",
  });
  write(KEYS.companies, records);
  return records;
};
const initialUsers = () => read(KEYS.users, read("punewalkin_auth_users", INITIAL_DEMO_USERS).map(u => ({
  ...u, accountStatus: u.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
})).map(({ password, ...u }) => u));
const initialNotifications = () => read(KEYS.notifications, [
  { id: "n-company", title: "Employer registrations need review", description: "Review company verification requests.", target: "/admin/companies", read: false, createdAt: today() },
  { id: "n-drive", title: "Walk-In Drive approval queue", description: "Review submitted drives before publication.", target: "/admin/drive-approvals", read: false, createdAt: today() },
]);

const navItems = [
  ["Dashboard", "/admin/dashboard", DashboardIcon],
  ["Companies & Employers", "/admin/companies", BuildingIcon],
  ["Drive Approvals", "/admin/drive-approvals", ShieldCheckIcon],
  ["User Management", "/admin/users", UsersIcon],
  ["Jobs & Walk-In Drives", "/admin/drives", BriefcaseIcon],
  ["Applications & Interviews", "/admin/recruitment", ClipboardListIcon],
  ["Reports & Analytics", "/admin/reports", ChartBarIcon],
  ["Activity Logs", "/admin/activity-logs", ClockIcon],
  ["Notifications", "/admin/notifications", MailIcon],
  ["Settings", "/admin/settings", FileTextIcon],
];
const titles = Object.fromEntries(navItems.map(([label, path]) => [path, label]));
const pretty = value => String(value || "Unknown").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
const dateText = value => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const statusClass = value => {
  const s = String(value || "").toLowerCase();
  if (["verified", "approved", "published", "active", "selected", "shortlisted"].some(x => s.includes(x))) return "admin-status success";
  if (["pending", "under review", "changes requested", "scheduled"].some(x => s.includes(x))) return "admin-status warning";
  if (["rejected", "suspended", "cancelled"].some(x => s.includes(x))) return "admin-status danger";
  return "admin-status neutral";
};
function Status({ value }) { return <span className={statusClass(value)}>{pretty(value)}</span>; }
function PageHeading({ title, subtitle, actions }) {
  return <div className="admin-page-heading"><div><p className="admin-eyebrow">ADMINISTRATION</p><h1>{title}</h1><p>{subtitle}</p></div>{actions}</div>;
}
function Metric({ label, value, hint, icon: Icon, tone = "blue" }) {
  return <div className="admin-metric"><div className={`admin-metric-icon ${tone}`}><Icon className="h-5 w-5" /></div><div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div></div>;
}
function Empty({ title = "Nothing to show yet", description = "Records will appear here when they are available." }) {
  return <div className="admin-empty"><div className="admin-empty-icon"><FileTextIcon className="h-6 w-6" /></div><strong>{title}</strong><p>{description}</p></div>;
}
function DataTable({ columns, rows, emptyTitle }) {
  if (!rows.length) return <Empty title={emptyTitle || "No matching records"} description="Try changing your search or filters." />;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={row.id || i}>{columns.map(c => <td key={c.key}>{c.render ? c.render(row) : (row[c.key] ?? "—")}</td>)}</tr>)}</tbody></table></div>;
}
function SearchFilters({ search, setSearch, placeholder = "Search records...", children }) {
  return <div className="admin-toolbar"><label className="admin-search"><SearchIcon className="h-4 w-4" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder} /></label>{children}</div>;
}
function Field({ label, value }) { return <div className="admin-detail-field"><span>{label}</span><strong>{value || "Not provided"}</strong></div>; }

export function AdminModule() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [companies, setCompanies] = useState(initialCompanies);
  const [users, setUsers] = useState(initialUsers);
  const [drives, setDrives] = useState(() => storageService.getDrives());
  const [jobs] = useState(() => storageService.getJobs());
  const [applications] = useState(() => storageService.getApplications());
  const [activities, setActivities] = useState(() => read(KEYS.activities, storageService.getActivities().map((a, i) => ({
    id: a.id || `seed-${i}`, actor: "Platform", action: a.title || a.type || "Platform activity",
    record: a.description || a.entityId || "Platform", previousStatus: "", newStatus: "",
    reason: "", createdAt: a.createdAt || today(),
  }))));
  const [notifications, setNotifications] = useState(initialNotifications);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState("");
  const [settingsName, setSettingsName] = useState(user?.name || "Administrator");
  const [emailPrefs, setEmailPrefs] = useState(() => read(KEYS.preferences, { emailPrefs: true }).emailPrefs);

  useEffect(() => { write(KEYS.companies, companies); }, [companies]);
  useEffect(() => { write(KEYS.users, users); }, [users]);
  useEffect(() => { write(KEYS.activities, activities); }, [activities]);
  useEffect(() => { write(KEYS.notifications, notifications); }, [notifications]);
  useEffect(() => { setQuery(""); setFilter("All"); setSelected(null); }, [location.pathname]);

  const activePath = navItems.find(([, path]) => location.pathname === path)?.[1] || "/admin/dashboard";
  const pageTitle = titles[activePath] || "Dashboard";
  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);
  const candidateCount = users.filter(u => u.role === "CANDIDATE").length;
  const employerCount = users.filter(u => u.role === "EMPLOYER").length;
  const verifiedCount = companies.filter(c => c.verificationStatus === "VERIFIED").length;
  const pendingCompanies = companies.filter(c => c.verificationStatus === "PENDING");
  const pendingDrives = drives.filter(d => ["Pending Approval", "PENDING", "PENDING_APPROVAL"].includes(d.approvalStatus));
  const totalApps = applications.length;
  const unread = notifications.filter(n => !n.read).length;
  const addActivity = (action, record, previousStatus = "", newStatus = "", why = "") => {
    setActivities(prev => [{ id: `admin-act-${Date.now()}`, actor: user?.name || "Administrator", action, record, previousStatus, newStatus, reason: why, createdAt: new Date().toISOString() }, ...prev]);
  };
  const updateCompany = (id, status, why = "") => {
    const company = companies.find(c => c.id === id);
    if (!company) return;
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, verificationStatus: status, rejectionReason: why } : c));
    addActivity(status === "VERIFIED" ? "Company verified" : "Company rejected", company.name, company.verificationStatus, status, why);
    setDecision(null); setReason(""); setSelected(null);
    showToast(status === "VERIFIED" ? "Company marked as verified." : "Company rejection saved.");
  };
  const updateDrive = (drive, status, why = "") => {
    if (status === "Approved") {
      const company = companyMap[drive.companyId] || companies.find(c => c.name === drive.companyName || c.name === drive.company);
      if (company && company.verificationStatus !== "VERIFIED") {
        showToast("Verify the associated company before approving this drive.", "error");
        return;
      }
    }
    const updated = drives.map(d => d.id === drive.id ? { ...d, approvalStatus: status, adminFeedback: why || null, publicationStatus: status === "Approved" ? (d.publicationStatus || "Published") : "Unpublished" } : d);
    setDrives(updated);
    storageService.setDrives(updated);
    addActivity(status === "Approved" ? "Drive approved" : status === "Rejected" ? "Drive rejected" : "Changes requested", drive.title, drive.approvalStatus, status, why);
    setDecision(null); setReason(""); setSelected(null);
    showToast(status === "Approved" ? "Drive approved." : status === "Rejected" ? "Drive rejected." : "Review comment saved.");
  };
  const updateUser = (u, status, why = "") => {
    if (u.id === user?.id) { showToast("You cannot suspend the currently logged-in administrator.", "error"); return; }
    setUsers(prev => prev.map(item => item.id === u.id ? { ...item, accountStatus: status, suspensionReason: why } : item));
    addActivity(status === "SUSPENDED" ? "User suspended" : "User reactivated", u.name, u.accountStatus, status, why);
    setDecision(null); setReason(""); setSelected(null);
    showToast(status === "SUSPENDED" ? "Account suspended." : "Account reactivated.");
  };
  const confirmDecision = () => {
    if (!decision) return;
    const needsReason = ["REJECTED", "CHANGES_REQUESTED", "SUSPENDED"].includes(String(decision.status).toUpperCase());
    if (needsReason && reason.trim().length < 5) { showToast("Please enter a reason of at least 5 characters.", "error"); return; }
    if (decision.type === "company") updateCompany(decision.record.id, decision.status, reason.trim());
    if (decision.type === "drive") updateDrive(decision.record, decision.status, reason.trim());
    if (decision.type === "user") updateUser(decision.record, decision.status, reason.trim());
  };
  const markRead = id => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => { setNotifications(prev => prev.map(n => ({ ...n, read: true }))); showToast("All notifications marked as read."); };
  const filtered = (rows, fields, statusField) => rows.filter(row => {
    const matchesQuery = !query || fields.some(f => String(row[f] || "").toLowerCase().includes(query.toLowerCase()));
    const matchesFilter = filter === "All" || !statusField || String(row[statusField] || "").toLowerCase().replaceAll("_", " ") === filter.toLowerCase();
    return matchesQuery && matchesFilter;
  });

  const dashboard = () => (
    <>
      <PageHeading title="Dashboard" subtitle="A live overview of platform activity and items requiring attention." actions={<Button onClick={() => navigate("/admin/reports")} icon={ChartBarIcon}>View reports</Button>} />
      <div className="admin-metrics-grid">
        <Metric label="Total Candidates" value={candidateCount} hint="Registered accounts" icon={UsersIcon} />
        <Metric label="Total Employers" value={employerCount} hint="Employer accounts" icon={BuildingIcon} tone="purple" />
        <Metric label="Verified Companies" value={verifiedCount} hint={`${pendingCompanies.length} pending review`} icon={ShieldCheckIcon} tone="green" />
        <Metric label="Pending Drive Approvals" value={pendingDrives.length} hint="Awaiting admin review" icon={CalendarIcon} tone="amber" />
        <Metric label="Total Jobs" value={jobs.length} hint="Across the platform" icon={BriefcaseIcon} tone="purple" />
        <Metric label="Total Walk-In Drives" value={drives.length} hint="All statuses" icon={CalendarIcon} tone="blue" />
        <Metric label="Total Applications" value={totalApps} hint="Application records" icon={ClipboardListIcon} tone="green" />
        <Metric label="Pending Company Verifications" value={pendingCompanies.length} hint="Company review queue" icon={ClockIcon} tone="amber" />
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel"><div className="admin-panel-head"><div><h2>Pending approvals</h2><p>Items that need your review</p></div><Button variant="ghost" size="sm" onClick={() => navigate("/admin/drive-approvals")}>View queue →</Button></div>
          {[...pendingCompanies.slice(0, 3).map(c => ({ id: c.id, title: c.name, sub: `Company • Submitted ${dateText(c.createdAt)}`, kind: "company", record: c })), ...pendingDrives.slice(0, 3).map(d => ({ id: d.id, title: d.title, sub: `Walk-in drive • Submitted ${dateText(d.submittedAt || d.createdAt)}`, kind: "drive", record: d }))].slice(0, 5).map(item => <div className="admin-approval-row" key={`${item.kind}-${item.id}`}><div className="admin-list-avatar">{item.kind === "company" ? <BuildingIcon className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}</div><div className="admin-list-copy"><strong>{item.title}</strong><span>{item.sub}</span></div><Button variant="outline" size="sm" onClick={() => { setSelected({ ...item.record, _kind: item.kind }); }}>Review</Button></div>)}
          {!pendingCompanies.length && !pendingDrives.length && <Empty title="You're all caught up" description="There are no pending approvals right now." />}
        </section>
        <section className="admin-panel"><div className="admin-panel-head"><div><h2>Quick actions</h2><p>Jump to common admin tasks</p></div></div><div className="admin-quick-actions">
          {[[BuildingIcon, "Review companies", "/admin/companies"], [ShieldCheckIcon, "Approve drives", "/admin/drive-approvals"], [UsersIcon, "Manage users", "/admin/users"], [ClipboardListIcon, "View applications", "/admin/recruitment"], [ChartBarIcon, "Open reports", "/admin/reports"]].map(([Icon, label, path]) => <button key={path} onClick={() => navigate(path)}><span><Icon className="h-5 w-5" /></span><strong>{label}</strong><span className="admin-arrow">↗</span></button>)}
        </div></section>
        <section className="admin-panel admin-panel-wide"><div className="admin-panel-head"><div><h2>Upcoming walk-in drives</h2><p>Drive schedule and current review status</p></div><Button variant="ghost" size="sm" onClick={() => navigate("/admin/drives")}>All drives →</Button></div>
          {drives.filter(d => d.interviewDate && new Date(d.interviewDate) >= new Date(today())).slice(0, 4).map(d => <div className="admin-upcoming-row" key={d.id}><div className="admin-date-tile"><b>{new Date(d.interviewDate).getDate()}</b><span>{new Date(d.interviewDate).toLocaleDateString("en-IN", { month: "short" })}</span></div><div className="admin-list-copy"><strong>{d.title}</strong><span>{d.jobTitle || "Role not provided"} · {d.city || d.venueName || "Location not provided"}</span></div><Status value={d.approvalStatus} /></div>)}
          {!drives.some(d => d.interviewDate && new Date(d.interviewDate) >= new Date(today())) && <Empty title="No upcoming drives" />}
        </section>
        <section className="admin-panel"><div className="admin-panel-head"><div><h2>Recent activity</h2><p>Latest platform and admin events</p></div><Button variant="ghost" size="sm" onClick={() => navigate("/admin/activity-logs")}>View logs →</Button></div>
          {activities.slice(0, 5).map(a => <div className="admin-activity-row" key={a.id}><span className="admin-activity-dot" /><div className="admin-list-copy"><strong>{a.action}</strong><span>{a.record} · {dateText(a.createdAt)}</span></div></div>)}
          {!activities.length && <Empty title="No activity recorded" />}
        </section>
      </div>
    </>
  );

  const companiesPage = () => {
    const rows = filtered(companies, ["name", "employerName", "email", "industry"], "verificationStatus");
    return <><PageHeading title="Companies & Employers" subtitle="Review employer registrations and company verification requests." />
      <div className="admin-panel"><SearchFilters search={query} setSearch={setQuery} placeholder="Search company, employer, or email"><select className="admin-select" value={filter} onChange={e => setFilter(e.target.value)}>{["All", "PENDING", "VERIFIED", "REJECTED"].map(v => <option key={v}>{v}</option>)}</select></SearchFilters>
      <DataTable rows={rows} emptyTitle="No companies found" columns={[
        { key: "name", label: "Company", render: r => <div className="admin-company-cell"><span className="admin-company-avatar">{(r.name || "C").slice(0, 1)}</span><div><strong>{r.name}</strong><small>{r.industry || "Industry not provided"}</small></div></div> },
        { key: "employerName", label: "Employer" }, { key: "email", label: "Business email" }, { key: "createdAt", label: "Registered", render: r => dateText(r.createdAt) },
        { key: "verificationStatus", label: "Verification", render: r => <Status value={r.verificationStatus} /> },
        { key: "actions", label: "Actions", render: r => <div className="admin-actions"><button className="admin-link-button" onClick={() => setSelected({ ...r, _kind: "company" })}>Details</button>{r.verificationStatus !== "VERIFIED" && <button className="admin-link-button green" onClick={() => setDecision({ type: "company", record: r, status: "VERIFIED" })}>Verify</button>}{r.verificationStatus !== "REJECTED" && <button className="admin-link-button red" onClick={() => setDecision({ type: "company", record: r, status: "REJECTED" })}>Reject</button>}</div> },
      ]} /></div></>;
  };

  const drivesPage = (approvalOnly = false) => {
    const base = approvalOnly ? drives.filter(d => d.approvalStatus !== "Draft") : drives;
    const rows = base.filter(d => (!query || [d.title, d.jobTitle, d.city, d.venueName, companyMap[d.companyId]?.name].some(v => String(v || "").toLowerCase().includes(query.toLowerCase()))) && (filter === "All" || String(d.approvalStatus || "").toLowerCase().replaceAll("_", " ") === filter.toLowerCase()));
    return <><PageHeading title={approvalOnly ? "Drive Approvals" : "Jobs & Walk-In Drives"} subtitle={approvalOnly ? "Check drive details and make approval decisions before publication." : "Monitor jobs and walk-in drives across the platform."} />
      <div className="admin-panel"><SearchFilters search={query} setSearch={setQuery} placeholder="Search drive title, role, or location"><select className="admin-select" value={filter} onChange={e => setFilter(e.target.value)}>{["All", "Pending Approval", "Approved", "Rejected", "Changes Requested", "Draft"].map(v => <option key={v}>{v}</option>)}</select></SearchFilters>
      <DataTable rows={rows} emptyTitle="No drives match these filters" columns={[
        { key: "title", label: "Drive", render: r => <div><strong>{r.title}</strong><small className="admin-cell-sub">{r.jobTitle || "Role not provided"}</small></div> },
        { key: "company", label: "Company", render: r => companyMap[r.companyId]?.name || r.companyName || r.company || "Company not linked" },
        { key: "interviewDate", label: "Drive date", render: r => dateText(r.interviewDate) },
        { key: "location", label: "Location", render: r => <span className="admin-location"><MapPinIcon className="h-3.5 w-3.5" />{r.city || r.venueName || "Not provided"}</span> },
        { key: "approvalStatus", label: "Approval status", render: r => <Status value={r.approvalStatus} /> },
        { key: "actions", label: "Actions", render: r => <div className="admin-actions"><button className="admin-link-button" onClick={() => setSelected({ ...r, _kind: "drive" })}>Details</button>{String(r.approvalStatus).toLowerCase().includes("pending") && <><button className="admin-link-button green" onClick={() => setDecision({ type: "drive", record: r, status: "Approved" })}>Approve</button><button className="admin-link-button red" onClick={() => setDecision({ type: "drive", record: r, status: "Rejected" })}>Reject</button><button className="admin-link-button" onClick={() => setDecision({ type: "drive", record: r, status: "CHANGES_REQUESTED" })}>Request changes</button></>}</div> },
      ]} /></div>
      {!approvalOnly && <div className="admin-panel"><div className="admin-panel-head"><div><h2>Jobs overview</h2><p>Job records are monitored here; employer-owned job details are not edited by Admin.</p></div></div><DataTable rows={jobs.filter(j => !query || `${j.title} ${j.location || ""} ${j.status || ""}`.toLowerCase().includes(query.toLowerCase()))} emptyTitle="No job records" columns={[
        { key: "title", label: "Job title", render: r => <strong>{r.title}</strong> },
        { key: "companyId", label: "Company", render: r => companyMap[r.companyId]?.name || "Company not linked" },
        { key: "employmentType", label: "Employment type" },
        { key: "location", label: "Location" },
        { key: "createdAt", label: "Created", render: r => dateText(r.createdAt) },
        { key: "status", label: "Job status", render: r => <Status value={r.status} /> },
      ]} /></div>}</>;
  };

  const usersPage = () => {
    const rows = users.filter(u => ["CANDIDATE", "EMPLOYER"].includes(u.role) && (!query || `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase())) && (filter === "All" || u.role === filter || u.accountStatus === filter));
    return <><PageHeading title="User Management" subtitle="Inspect candidate and employer accounts. Authentication secrets are never displayed." />
      <div className="admin-panel"><SearchFilters search={query} setSearch={setQuery} placeholder="Search by name or email"><select className="admin-select" value={filter} onChange={e => setFilter(e.target.value)}>{["All", "CANDIDATE", "EMPLOYER", "ACTIVE", "SUSPENDED"].map(v => <option key={v}>{v}</option>)}</select></SearchFilters>
      <DataTable rows={rows} emptyTitle="No users found" columns={[
        { key: "name", label: "User", render: r => <div className="admin-company-cell"><span className="admin-company-avatar">{(r.name || "U").slice(0, 1)}</span><div><strong>{r.name}</strong><small>{r.email}</small></div></div> },
        { key: "role", label: "Role", render: r => pretty(r.role) }, { key: "createdAt", label: "Registered", render: r => dateText(r.createdAt) },
        { key: "companyName", label: "Company", render: r => r.companyName || "—" },
        { key: "accountStatus", label: "Account status", render: r => <Status value={r.accountStatus || r.status} /> },
        { key: "actions", label: "Actions", render: r => <div className="admin-actions"><button className="admin-link-button" onClick={() => setSelected({ ...r, _kind: "user" })}>View</button>{r.accountStatus === "SUSPENDED" ? <button className="admin-link-button green" onClick={() => setDecision({ type: "user", record: r, status: "ACTIVE" })}>Reactivate</button> : <button className="admin-link-button red" disabled={r.id === user?.id} onClick={() => setDecision({ type: "user", record: r, status: "SUSPENDED" })}>Suspend</button>}</div> },
      ]} /></div></>;
  };

  const recruitmentPage = () => {
    const apps = applications.filter(a => !query || `${a.candidateName || a.name || ""} ${a.jobTitle || ""} ${a.driveTitle || ""} ${a.status || ""}`.toLowerCase().includes(query.toLowerCase()));
    const statuses = ["Registered", "Under Review", "Shortlisted", "Interview Scheduled", "Selected", "Rejected"];
    return <><PageHeading title="Applications & Interviews" subtitle="Monitor recruitment progress without changing employer-owned evaluations." />
      <div className="admin-metrics-grid compact">{statuses.map((s, i) => <Metric key={s} label={s} value={applications.filter(a => String(a.status || "Registered").toLowerCase().includes(s.toLowerCase())).length} hint="Application records" icon={i === 2 ? CheckCircleIcon : ClipboardListIcon} tone={i === 5 ? "amber" : "blue"} />)}</div>
      <div className="admin-panel"><SearchFilters search={query} setSearch={setQuery} placeholder="Search candidate, job, or drive" /><DataTable rows={apps} emptyTitle="No application records" columns={[
        { key: "candidateName", label: "Candidate", render: r => r.candidateName || r.name || "Candidate record" },
        { key: "jobTitle", label: "Job / Drive", render: r => r.jobTitle || r.driveTitle || r.driveId || "Not linked" },
        { key: "appliedAt", label: "Applied", render: r => dateText(r.appliedAt || r.createdAt) },
        { key: "status", label: "Status", render: r => <Status value={r.status || "Registered"} /> },
        { key: "details", label: "Details", render: r => <button className="admin-link-button" onClick={() => setSelected({ ...r, _kind: "application" })}>View details</button> },
      ]} /></div>
      <div className="admin-panel admin-interview-note"><h2>Interview monitoring</h2><p>Interview schedule details are shown only when supplied by shared mock data. No independent scheduling workflow is enabled.</p><Empty title="No separate interview schedule data" description="Interview dates and locations will appear here when the recruitment module provides them." /></div>
    </>;
  };

  const reportsPage = () => {
    const applicationStatuses = ["Registered", "Under Review", "Shortlisted", "Selected", "Rejected"];
    const companyStatuses = ["PENDING", "VERIFIED", "REJECTED"];
    const driveStatuses = ["Pending Approval", "Approved", "Rejected", "Changes Requested", "Draft"];
    const bar = (label, count, total) => <div className="admin-bar-row" key={label}><div><span>{label}</span><b>{count}</b></div><div className="admin-bar-track"><span style={{ width: `${total ? Math.max(2, count / total * 100) : 0}%` }} /></div></div>;
    return <><PageHeading title="Reports & Analytics" subtitle="Summaries calculated from the current shared mock records." actions={<Button variant="outline" onClick={() => { const csv = [["Metric","Count"],["Candidates",candidateCount],["Employers",employerCount],["Verified companies",verifiedCount],["Jobs",jobs.length],["Drives",drives.length],["Applications",applications.length]].map(r => r.join(",")).join("\\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "admin-report.csv"; a.click(); URL.revokeObjectURL(a.href); showToast("Report CSV exported."); }}>Export summary CSV</Button>} />
      <div className="admin-metrics-grid"><Metric label="Registered candidates" value={candidateCount} hint="Current mock data" icon={UsersIcon} /><Metric label="Employers" value={employerCount} hint="Current mock data" icon={BuildingIcon} tone="purple" /><Metric label="Jobs & drives" value={jobs.length + drives.length} hint="Combined records" icon={BriefcaseIcon} tone="green" /><Metric label="Applications" value={totalApps} hint="Current mock data" icon={ClipboardListIcon} tone="amber" /></div>
      <div className="admin-report-grid"><section className="admin-panel"><h2>Applications by status</h2><p className="admin-panel-sub">Counts based on available application statuses</p>{applicationStatuses.map(s => bar(s, applications.filter(a => String(a.status || "Registered").toLowerCase().includes(s.toLowerCase())).length, Math.max(applications.length, 1)))}</section>
      <section className="admin-panel"><h2>Company verification</h2><p className="admin-panel-sub">Current verification queue</p>{companyStatuses.map(s => bar(pretty(s), companies.filter(c => c.verificationStatus === s).length, Math.max(companies.length, 1)))}</section>
      <section className="admin-panel"><h2>Walk-in drive statuses</h2><p className="admin-panel-sub">Approval lifecycle overview</p>{driveStatuses.map(s => bar(s, drives.filter(d => String(d.approvalStatus || "").toLowerCase() === s.toLowerCase()).length, Math.max(drives.length, 1)))}</section></div>
    </>;
  };

  const activityPage = () => {
    const rows = activities.filter(a => !query || `${a.actor} ${a.action} ${a.record} ${a.reason}`.toLowerCase().includes(query.toLowerCase()));
    return <><PageHeading title="Activity Logs" subtitle="A readable history of important actions in this frontend demonstration." />
      <div className="admin-panel"><SearchFilters search={query} setSearch={setQuery} placeholder="Search actor, action, or affected record" /><DataTable rows={rows} emptyTitle="No activity logs" columns={[
        { key: "createdAt", label: "Timestamp", render: r => new Date(r.createdAt).toLocaleString("en-IN") },
        { key: "actor", label: "Actor" }, { key: "action", label: "Action" }, { key: "record", label: "Affected record" },
        { key: "previousStatus", label: "Previous status", render: r => r.previousStatus ? pretty(r.previousStatus) : "—" },
        { key: "newStatus", label: "New status", render: r => r.newStatus ? <Status value={r.newStatus} /> : "—" },
        { key: "reason", label: "Reason / comment", render: r => r.reason || "—" },
      ]} /><p className="admin-footnote">Demo limitation: browser-stored logs are not tamper-resistant audit records. Production audit logging must be enforced by the backend.</p></div></>;
  };

  const notificationsPage = () => <><PageHeading title="Notifications" subtitle="Review admin reminders and navigate to the relevant work queue." actions={<Button variant="outline" onClick={markAllRead} disabled={!unread}>Mark all as read</Button>} />
    <div className="admin-panel">{notifications.length ? notifications.map(n => <div className={`admin-notification ${n.read ? "" : "unread"}`} key={n.id}><span className="admin-notification-icon"><MailIcon className="h-5 w-5" /></span><div className="admin-list-copy"><strong>{n.title}</strong><span>{n.description}</span><small>{dateText(n.createdAt)} · {n.read ? "Read" : "Unread"}</small></div><div className="admin-actions"><button className="admin-link-button" onClick={() => { markRead(n.id); navigate(n.target); }}>Open</button>{!n.read && <button className="admin-link-button green" onClick={() => markRead(n.id)}>Mark read</button>}</div></div>) : <Empty title="You're all caught up" description="New review reminders will appear here." />}</div></>;

  const settingsPage = () => <><PageHeading title="Admin Settings" subtitle="Manage your display preferences for this frontend demo." />
    <div className="admin-settings-grid"><section className="admin-panel"><h2>Profile</h2><p className="admin-panel-sub">Profile values from the current mock session.</p><Field label="Display name" value={user?.name} /><Field label="Email" value={user?.email} /><Field label="Role" value={user?.role} /><p className="admin-footnote">Role changes and public admin registration are intentionally not available.</p></section>
    <section className="admin-panel"><h2>Preferences</h2><label className="admin-form-label">Display name (local preference)<input className="admin-input" value={settingsName} onChange={e => setSettingsName(e.target.value)} /></label><label className="admin-toggle-row"><span><strong>Admin review reminders</strong><small>Show reminder notifications in this demo</small></span><input type="checkbox" checked={emailPrefs} onChange={e => setEmailPrefs(e.target.checked)} /></label><Button onClick={() => { const next = { settingsName, emailPrefs }; write(KEYS.preferences, next); showToast("Preferences saved in this browser."); }}>Save preferences</Button><p className="admin-footnote">Preferences are saved in local browser storage. Password changes are not simulated here.</p></section></div>
  </>;

  let content;
  switch (activePath) {
    case "/admin/companies": content = companiesPage(); break;
    case "/admin/drive-approvals": content = drivesPage(true); break;
    case "/admin/users": content = usersPage(); break;
    case "/admin/drives": content = drivesPage(false); break;
    case "/admin/recruitment": content = recruitmentPage(); break;
    case "/admin/reports": content = reportsPage(); break;
    case "/admin/activity-logs": content = activityPage(); break;
    case "/admin/notifications": content = notificationsPage(); break;
    case "/admin/settings": content = settingsPage(); break;
    default: content = dashboard();
  }

  return <div className="admin-app">
    <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""} ${mobileNav ? "mobile-open" : ""}`}>
      <div className="admin-brand"><div className="admin-brand-mark">PW</div>{!collapsed && <div><strong>Pune Walk-In</strong><span>ADMIN PANEL</span></div>}<button className="admin-collapse" onClick={() => setCollapsed(v => !v)} aria-label="Toggle sidebar">{collapsed ? "›" : "‹"}</button></div>
      <div className="admin-nav-label">{!collapsed && "WORKSPACE"}</div>
      <nav>{navItems.map(([label, path, Icon]) => <Link key={path} to={path} onClick={() => setMobileNav(false)} className={`admin-nav-link ${activePath === path ? "active" : ""}`} title={collapsed ? label : undefined}><Icon className="h-5 w-5" />{!collapsed && <span>{label}</span>}{!collapsed && path === "/admin/notifications" && unread > 0 && <b>{unread}</b>}</Link>)}</nav>
      {!collapsed && <div className="admin-sidebar-bottom"><div className="admin-sidebar-help"><ShieldCheckIcon className="h-5 w-5" /><strong>Admin workspace</strong><p>Frontend demo using shared mock records.</p></div><span>Platform operations · v1.0</span></div>}
    </aside>
    <div className="admin-main">
      <header className="admin-topbar"><button className="admin-mobile-menu" onClick={() => setMobileNav(v => !v)}>☰</button><div className="admin-breadcrumb"><span>Workspace</span><b>/</b><strong>{pageTitle}</strong></div><div className="admin-topbar-actions"><button className="admin-notification-button" onClick={() => navigate("/admin/notifications")} aria-label="Notifications"><MailIcon className="h-5 w-5" />{unread > 0 && <i>{unread}</i>}</button><div className="admin-profile"><span className="admin-profile-avatar">{(user?.name || "A").slice(0, 1)}</span><div><strong>{user?.name || "Administrator"}</strong><small>Administrator</small></div></div><button className="admin-logout" onClick={() => { logout(); navigate("/login", { replace: true }); }}>Sign out</button></div></header>
      <main className="admin-content">{content}<footer className="admin-footer">Pune Walk-In Drive & Hiring Management Platform <span>Admin module · mock data</span></footer></main>
    </div>
    {selected && <Modal isOpen onClose={() => setSelected(null)} title={selected._kind === "company" ? "Company details" : selected._kind === "drive" ? "Walk-In Drive details" : selected._kind === "user" ? "User details" : "Application details"} subtitle="Information available in the current mock records" maxWidth="max-w-2xl">
      {selected._kind === "company" ? <div className="admin-detail-grid"><Field label="Company name" value={selected.name} /><Field label="Employer / contact" value={selected.employerName} /><Field label="Business email" value={selected.email} /><Field label="Phone" value={selected.phone} /><Field label="Industry" value={selected.industry} /><Field label="Website" value={selected.website} /><Field label="Address" value={selected.address} /><Field label="Registered" value={dateText(selected.createdAt)} /><Field label="Verification status" value={pretty(selected.verificationStatus)} /><Field label="Previous review reason" value={selected.rejectionReason} /><div className="admin-detail-wide"><Field label="Company description" value={selected.description} /></div><p className="admin-footnote admin-detail-wide">A verified status in this mock application is a demonstration state, not legal verification of a business.</p></div>
      : selected._kind === "drive" ? <div className="admin-detail-grid"><Field label="Drive title" value={selected.title} /><Field label="Job role" value={selected.jobTitle} /><Field label="Company" value={companyMap[selected.companyId]?.name || selected.companyName || selected.company} /><Field label="Date" value={dateText(selected.interviewDate)} /><Field label="Reporting time" value={selected.reportingTime} /><Field label="Location" value={selected.venueName || selected.city} /><Field label="Address" value={selected.venueAddress} /><Field label="Vacancies" value={selected.vacancies} /><Field label="Salary / package" value={selected.salary} /><Field label="Approval status" value={pretty(selected.approvalStatus)} /><Field label="Review notes" value={selected.adminFeedback} /><div className="admin-detail-wide"><Field label="Job description" value={selected.description || selected.jobDescription} /></div><p className="admin-footnote admin-detail-wide">Drive approval is blocked when a linked company is present and not marked verified.</p></div>
      : selected._kind === "user" ? <div className="admin-detail-grid"><Field label="Name" value={selected.name} /><Field label="Email" value={selected.email} /><Field label="Role" value={pretty(selected.role)} /><Field label="Account status" value={pretty(selected.accountStatus || selected.status)} /><Field label="Registered" value={dateText(selected.createdAt)} /><Field label="Company" value={selected.companyName} /><Field label="Phone" value={selected.phone} /><Field label="Qualification" value={selected.qualification} /><Field label="Skills" value={Array.isArray(selected.skills) ? selected.skills.join(", ") : selected.skills} /><Field label="Suspension reason" value={selected.suspensionReason} /><p className="admin-footnote admin-detail-wide">Passwords, tokens, and authentication secrets are not shown.</p></div>
      : <div className="admin-detail-grid"><Field label="Candidate" value={selected.candidateName || selected.name} /><Field label="Candidate email" value={selected.candidateEmail || selected.email} /><Field label="Job / drive" value={selected.jobTitle || selected.driveTitle || selected.driveId} /><Field label="Status" value={pretty(selected.status || "Registered")} /><Field label="Applied on" value={dateText(selected.appliedAt)} /><Field label="Status history" value={selected.statusHistory} /></div>}
      <div className="admin-modal-actions"><Button variant="outline" onClick={() => setSelected(null)}>Close</Button>{selected._kind === "company" && selected.verificationStatus !== "VERIFIED" && <Button onClick={() => { setSelected(null); setDecision({ type: "company", record: selected, status: "VERIFIED" }); }}>Verify company</Button>}{selected._kind === "drive" && String(selected.approvalStatus).toLowerCase().includes("pending") && <Button onClick={() => { const item = selected; setSelected(null); setDecision({ type: "drive", record: item, status: "Approved" }); }}>Approve drive</Button>}</div>
    </Modal>}
    {decision && <Modal isOpen onClose={() => { setDecision(null); setReason(""); }} title={decision.status === "VERIFIED" || decision.status === "Approved" || decision.status === "ACTIVE" ? "Confirm action" : decision.status === "CHANGES_REQUESTED" ? "Request changes" : "Confirm decision"} subtitle={`${decision.record.name || decision.record.title || decision.record.email || "Selected record"} · ${pretty(decision.status)}`} maxWidth="max-w-lg">
      <p className="admin-confirm-copy">{decision.status === "VERIFIED" ? "Mark this company as verified in the mock platform?" : decision.status === "Approved" ? "Approve this drive for publication? The associated company must be verified." : String(decision.status).toUpperCase() === "REJECTED" ? "Reject this company or drive? A reason will be saved in the record and activity log." : decision.status === "SUSPENDED" ? "Suspend this account? The user record will be retained." : decision.status === "ACTIVE" ? "Reactivate this account?" : "Send this drive back for changes? Add a clear review comment for the employer."}</p>
      {["REJECTED", "CHANGES_REQUESTED", "SUSPENDED"].includes(String(decision.status).toUpperCase()) && <label className="admin-form-label">Reason / review comment <textarea className="admin-textarea" rows="4" value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter a clear reason (at least 5 characters)" /></label>}
      <div className="admin-modal-actions"><Button variant="outline" onClick={() => { setDecision(null); setReason(""); }}>Cancel</Button><Button variant={["REJECTED", "SUSPENDED"].includes(String(decision.status).toUpperCase()) ? "danger" : "primary"} onClick={confirmDecision}>Confirm</Button></div>
    </Modal>}
  </div>;
}
