import { IconBook, IconCalendarEvent, IconCertificate, IconFileText, IconLibrary, IconReceipt, IconSchool } from "@tabler/icons-react";
import { Link, useLocation, useParams } from "react-router-dom";

type Module = {
  title: string;
  description: string;
  icon: typeof IconBook;
  columns: string[];
  rows: string[][];
};

const modules: Record<string, Module> = {
  fees: {
    title: "Fee details",
    description: "View the current academic fee schedule and payment status.",
    icon: IconReceipt,
    columns: ["Component", "Due date", "Amount", "Status"],
    rows: [["Tuition fee", "30 Sep 2026", "₹42,000", "Due"], ["Library fee", "30 Sep 2026", "₹1,200", "Paid"], ["Examination fee", "15 Oct 2026", "₹2,500", "Due"]],
  },
  notices: {
    title: "Bulletin and notices",
    description: "Official notices and campus communications.",
    icon: IconFileText,
    columns: ["Notice", "Published", "Audience"],
    rows: [["Mid-semester examination schedule", "18 Sep 2026", "All students"], ["Library orientation", "15 Sep 2026", "First year"], ["Scholarship renewal window", "12 Sep 2026", "Eligible students"]],
  },
  documents: {
    title: "Documents",
    description: "Institution forms, circulars, and reference documents.",
    icon: IconFileText,
    columns: ["Document", "Category", "Updated"],
    rows: [["Academic calendar 2026–27", "Calendar", "01 Aug 2026"], ["Student handbook", "Handbook", "01 Aug 2026"], ["Code of conduct", "Policy", "12 Jul 2026"]],
  },
  syllabus: {
    title: "Syllabus",
    description: "Course outlines and academic units for the current term.",
    icon: IconBook,
    columns: ["Course", "Code", "Units", "Document"],
    rows: [["Data Structures", "CS301", "5 units", "View outline"], ["Database Systems", "CS302", "5 units", "View outline"], ["Operating Systems", "CS303", "6 units", "View outline"]],
  },
  library: {
    title: "Library",
    description: "Library hours, services, and current borrowing information.",
    icon: IconLibrary,
    columns: ["Service", "Details", "Availability"],
    rows: [["Central library", "08:00–20:00, Monday–Saturday", "Open"], ["Digital resources", "Journals and e-books", "Available"], ["Book return desk", "Ground floor, counter 2", "Open"]],
  },
  holidays: {
    title: "Holidays",
    description: "Approved institutional holidays and academic breaks.",
    icon: IconCalendarEvent,
    columns: ["Date", "Occasion", "Type"],
    rows: [["02 Oct 2026", "Gandhi Jayanti", "Holiday"], ["19 Oct 2026", "Dussehra", "Holiday"], ["26 Oct 2026", "Mid-semester break", "Academic break"]],
  },
  placement: {
    title: "Placement",
    description: "Placement cell announcements, drives, and preparation resources.",
    icon: IconCertificate,
    columns: ["Opportunity", "Registration closes", "Eligibility"],
    rows: [["Campus hiring orientation", "25 Sep 2026", "Final year"], ["Aptitude preparation series", "30 Sep 2026", "All students"], ["Industry talk: Cloud careers", "04 Oct 2026", "Open to all"]],
  },
  projects: {
    title: "Projects",
    description: "Project guidance, milestones, and submission references.",
    icon: IconSchool,
    columns: ["Milestone", "Date", "Owner"],
    rows: [["Project proposal", "30 Sep 2026", "Student"], ["Guide allocation", "07 Oct 2026", "Department"], ["Interim review", "20 Nov 2026", "Panel"]],
  },
  exams: {
    title: "Examinations",
    description: "Examination schedules, instructions, and published results.",
    icon: IconCertificate,
    columns: ["Assessment", "Date", "Venue"],
    rows: [["Mid-semester examination", "12–19 Oct 2026", "As per hall ticket"], ["Practical assessment", "02–06 Nov 2026", "Department labs"], ["End-semester examination", "07–18 Dec 2026", "To be announced"]],
  },
  leave: {
    title: "Leave information",
    description: "Leave policy, balances, and institutional guidance.",
    icon: IconCalendarEvent,
    columns: ["Leave type", "Annual allowance", "Guidance"],
    rows: [["Casual leave", "12 days", "Apply before absence"], ["Medical leave", "As approved", "Attach supporting document"], ["Academic duty", "As approved", "Department authorization required"]],
  },
};

export function StaticShowcasePage() {
  const { module = "notices", role = "student" } = useParams<{ module: string; role: string }>();
  const location = useLocation();
  const currentRole = location.pathname.split("/")[1] || role;
  const current = modules[module] ?? modules.notices;
  const Icon = current.icon;
  return <div className="showcase-page">
    <header className="feature-header">
      <div><div className="showcase-title"><Icon size={26} /><h2>{current.title}</h2></div><p>{current.description}</p></div>
      <Link className="button-link" to={`/${currentRole}`}>Back to dashboard</Link>
    </header>
    <p className="student-notice">Information shown here is maintained by the institution and is read-only.</p>
    <section className="content-card">
      <div className="roster-table-wrap"><table className="showcase-table"><thead><tr>{current.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{current.rows.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>
    </section>
  </div>;
}

export const showcaseModules = Object.keys(modules);
