import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Footer } from "@/components/footer";
import { LogoSettings } from "@/components/logo-settings";
import { FileConverter } from "@/components/file-converter";
import { Link } from "wouter";
import {
  FileText, Award, Palette, FolderOpen, Crown, Sparkles, Upload, Download,
  ChevronRight, ChevronLeft, Check, Loader2, User, Mail, Phone, MapPin,
  Briefcase, GraduationCap, Star, Globe, BookOpen, ArrowRight, Printer,
  RefreshCw, Lock, Zap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface CVData {
  personalInfo: { fullName: string; title: string; email: string; phone: string; location: string; linkedin?: string };
  summary: string;
  experience: Array<{ title: string; school: string; location?: string; period: string; description: string }>;
  education: Array<{ degree: string; institution: string; year: string; honors?: string }>;
  skills: string[];
  languages: string[];
  certifications: string[];
  subjects?: string[];
  gradeLevel?: string;
}

interface CertResult {
  certContent: { title: string; subtitle: string; body: string; signatureTitle: string };
  studentName: string; teacherName: string; schoolName: string; date: string; template: string; course: string;
}

// ─── CV Template Definitions ─────────────────────────────────────────────────
const CV_TEMPLATES = [
  { id: "academic",       name: "Academic Pro",           desc: "Formal sidebar layout, ideal for university lecturers",      accent: "#1e3a8a", bg: "#1e3a8a", text: "#fff" },
  { id: "modern",         name: "Modern Educator",        desc: "Purple-teal gradient header, contemporary two-column",       accent: "#7c3aed", bg: "#7c3aed", text: "#fff" },
  { id: "classic",        name: "Classic Scholar",        desc: "Single column, traditional serif, timeless",                 accent: "#111827", bg: "#111827", text: "#fff" },
  { id: "creative",       name: "Creative Classroom",     desc: "Colourful accents, perfect for primary school teachers",     accent: "#0d9488", bg: "#0d9488", text: "#fff" },
  { id: "international",  name: "International Teacher",  desc: "Clean two-column, great for overseas applications",          accent: "#b45309", bg: "#b45309", text: "#fff" },
  { id: "minimalist",     name: "Minimalist Clean",       desc: "Ultra-clean white space, suits modern schools",              accent: "#6b7280", bg: "#6b7280", text: "#fff" },
];

const CERT_TEMPLATES = [
  { id: "achievement",  name: "Achievement",   icon: "🏆", colors: ["#f59e0b", "#d97706"], desc: "For outstanding performance" },
  { id: "excellence",   name: "Excellence",    icon: "⭐", colors: ["#7c3aed", "#6d28d9"], desc: "For exceptional effort" },
  { id: "participation",name: "Participation", icon: "🎗️", colors: ["#0284c7", "#0369a1"], desc: "For taking part" },
  { id: "completion",   name: "Completion",    icon: "✅", colors: ["#16a34a", "#15803d"], desc: "For finishing a course" },
];

// ─── CV Template Renderers (inline styles for print compatibility) ────────────
function CVPreview({ data, template }: { data: CVData; template: string }) {
  const d = data;
  const pi = d.personalInfo;

  if (template === "academic") {
    return (
      <div style={{ display: "flex", fontFamily: "Georgia, serif", minHeight: "297mm", width: "210mm", margin: "0 auto", background: "#fff", boxShadow: "0 4px 32px rgba(0,0,0,0.12)" }}>
        <div style={{ width: "35%", background: "#1e3a8a", color: "#fff", padding: "32px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ textAlign: "center", paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "bold", color: "#fbbf24" }}>
              {pi.fullName.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div style={{ fontSize: "17px", fontWeight: "bold", color: "#fff", lineHeight: 1.3 }}>{pi.fullName}</div>
            <div style={{ fontSize: "11px", color: "#93c5fd", marginTop: "4px" }}>{pi.title}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Contact</div>
            {pi.email && <div style={{ fontSize: "10px", color: "#e2e8f0", marginBottom: "4px" }}>✉ {pi.email}</div>}
            {pi.phone && <div style={{ fontSize: "10px", color: "#e2e8f0", marginBottom: "4px" }}>📞 {pi.phone}</div>}
            {pi.location && <div style={{ fontSize: "10px", color: "#e2e8f0", marginBottom: "4px" }}>📍 {pi.location}</div>}
          </div>
          {d.skills.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Skills</div>
              {d.skills.map((s, i) => <div key={i} style={{ fontSize: "10px", color: "#e2e8f0", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{s}</div>)}
            </div>
          )}
          {d.languages.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Languages</div>
              {d.languages.map((l, i) => <div key={i} style={{ fontSize: "10px", color: "#e2e8f0", marginBottom: "3px" }}>{l}</div>)}
            </div>
          )}
          {d.subjects && d.subjects.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Subjects</div>
              {d.subjects.map((s, i) => <div key={i} style={{ fontSize: "10px", color: "#e2e8f0", marginBottom: "3px" }}>{s}</div>)}
            </div>
          )}
        </div>
        <div style={{ flex: 1, padding: "32px 28px" }}>
          {d.summary && (
            <div style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "2px solid #1e3a8a" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Professional Summary</div>
              <div style={{ fontSize: "11px", color: "#374151", lineHeight: 1.6 }}>{d.summary}</div>
            </div>
          )}
          {d.experience.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Experience</div>
              {d.experience.map((e, i) => (
                <div key={i} style={{ marginBottom: "14px", paddingLeft: "12px", borderLeft: "3px solid #fbbf24" }}>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#111827" }}>{e.title}</div>
                  <div style={{ fontSize: "10px", color: "#1e3a8a", fontWeight: "600" }}>{e.school}{e.location ? ` · ${e.location}` : ""}</div>
                  <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: "4px" }}>{e.period}</div>
                  {e.description.split("\n").map((pt, j) => <div key={j} style={{ fontSize: "10px", color: "#374151", lineHeight: 1.5 }}>{pt}</div>)}
                </div>
              ))}
            </div>
          )}
          {d.education.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Education</div>
              {d.education.map((e, i) => (
                <div key={i} style={{ marginBottom: "10px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#111827" }}>{e.degree}</div>
                  <div style={{ fontSize: "10px", color: "#6b7280" }}>{e.institution} · {e.year}{e.honors ? ` · ${e.honors}` : ""}</div>
                </div>
              ))}
            </div>
          )}
          {d.certifications.length > 0 && (
            <div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Certifications</div>
              {d.certifications.map((c, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "3px" }}>• {c}</div>)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (template === "modern") {
    return (
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", minHeight: "297mm", width: "210mm", margin: "0 auto", background: "#fff", boxShadow: "0 4px 32px rgba(0,0,0,0.12)" }}>
        <div style={{ background: "linear-gradient(135deg, #7c3aed, #0d9488)", padding: "32px 36px", color: "#fff" }}>
          <div style={{ fontSize: "26px", fontWeight: "800", letterSpacing: "-0.5px" }}>{pi.fullName}</div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", marginTop: "4px", marginBottom: "12px" }}>{pi.title}</div>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {pi.email && <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.9)" }}>✉ {pi.email}</span>}
            {pi.phone && <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.9)" }}>📞 {pi.phone}</span>}
            {pi.location && <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.9)" }}>📍 {pi.location}</span>}
          </div>
        </div>
        <div style={{ display: "flex", padding: "28px 36px", gap: "28px" }}>
          <div style={{ flex: "0 0 62%" }}>
            {d.summary && <div style={{ marginBottom: "22px" }}><div style={{ fontSize: "12px", fontWeight: "700", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", borderBottom: "2px solid #7c3aed", paddingBottom: "4px" }}>Profile</div><div style={{ fontSize: "11px", color: "#374151", lineHeight: 1.7 }}>{d.summary}</div></div>}
            {d.experience.length > 0 && (
              <div style={{ marginBottom: "22px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px", borderBottom: "2px solid #7c3aed", paddingBottom: "4px" }}>Experience</div>
                {d.experience.map((e, i) => (
                  <div key={i} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#111827" }}>{e.title}</div>
                        <div style={{ fontSize: "10px", color: "#7c3aed", fontWeight: "600" }}>{e.school}{e.location ? ` · ${e.location}` : ""}</div>
                      </div>
                      <div style={{ fontSize: "10px", color: "#9ca3af", whiteSpace: "nowrap", marginLeft: "8px" }}>{e.period}</div>
                    </div>
                    <div style={{ marginTop: "4px" }}>{e.description.split("\n").map((pt, j) => <div key={j} style={{ fontSize: "10px", color: "#374151", lineHeight: 1.5 }}>{pt}</div>)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: 1, borderLeft: "1px solid #e5e7eb", paddingLeft: "24px" }}>
            {d.education.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#0d9488", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Education</div>
                {d.education.map((e, i) => <div key={i} style={{ marginBottom: "8px" }}><div style={{ fontSize: "11px", fontWeight: "600", color: "#111827" }}>{e.degree}</div><div style={{ fontSize: "10px", color: "#6b7280" }}>{e.institution}</div><div style={{ fontSize: "10px", color: "#9ca3af" }}>{e.year}</div></div>)}
              </div>
            )}
            {d.skills.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#0d9488", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {d.skills.map((s, i) => <span key={i} style={{ fontSize: "9px", background: "#f3f4f6", color: "#374151", padding: "3px 8px", borderRadius: "100px", border: "1px solid #e5e7eb" }}>{s}</span>)}
                </div>
              </div>
            )}
            {d.languages.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#0d9488", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Languages</div>
                {d.languages.map((l, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "3px" }}>• {l}</div>)}
              </div>
            )}
            {d.subjects && d.subjects.length > 0 && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#0d9488", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Subjects</div>
                {d.subjects.map((s, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "3px" }}>• {s}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (template === "classic") {
    return (
      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", minHeight: "297mm", width: "210mm", margin: "0 auto", background: "#fff", padding: "48px 52px", boxShadow: "0 4px 32px rgba(0,0,0,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: "28px", paddingBottom: "20px", borderBottom: "2px solid #111827" }}>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#111827", letterSpacing: "2px", textTransform: "uppercase" }}>{pi.fullName}</div>
          <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "6px", letterSpacing: "1px" }}>{pi.title}</div>
          <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "8px" }}>
            {[pi.email, pi.phone, pi.location].filter(Boolean).join("  |  ")}
          </div>
        </div>
        {d.summary && <div style={{ marginBottom: "24px" }}><div style={{ fontSize: "12px", fontWeight: "bold", color: "#111827", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>OBJECTIVE</div><div style={{ fontSize: "11px", color: "#374151", lineHeight: 1.8 }}>{d.summary}</div><div style={{ height: "1px", background: "#e5e7eb", marginTop: "16px" }} /></div>}
        {d.experience.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#111827", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>PROFESSIONAL EXPERIENCE</div>
            {d.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", fontWeight: "bold", color: "#111827" }}>{e.title}</span><span style={{ fontSize: "10px", color: "#6b7280", fontStyle: "italic" }}>{e.period}</span></div>
                <div style={{ fontSize: "11px", color: "#4b5563", fontStyle: "italic", marginBottom: "4px" }}>{e.school}{e.location ? `, ${e.location}` : ""}</div>
                {e.description.split("\n").map((pt, j) => <div key={j} style={{ fontSize: "10px", color: "#374151", lineHeight: 1.6 }}>{pt}</div>)}
              </div>
            ))}
            <div style={{ height: "1px", background: "#e5e7eb", marginTop: "8px" }} />
          </div>
        )}
        {d.education.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#111827", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>EDUCATION</div>
            {d.education.map((e, i) => <div key={i} style={{ marginBottom: "8px" }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", fontWeight: "bold" }}>{e.degree}</span><span style={{ fontSize: "10px", color: "#6b7280" }}>{e.year}</span></div><div style={{ fontSize: "11px", color: "#4b5563", fontStyle: "italic" }}>{e.institution}{e.honors ? ` — ${e.honors}` : ""}</div></div>)}
            <div style={{ height: "1px", background: "#e5e7eb", marginTop: "8px" }} />
          </div>
        )}
        <div style={{ display: "flex", gap: "32px" }}>
          {d.skills.length > 0 && <div style={{ flex: 1 }}><div style={{ fontSize: "12px", fontWeight: "bold", color: "#111827", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>SKILLS</div>{d.skills.map((s, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "3px" }}>• {s}</div>)}</div>}
          {d.languages.length > 0 && <div style={{ flex: 1 }}><div style={{ fontSize: "12px", fontWeight: "bold", color: "#111827", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>LANGUAGES</div>{d.languages.map((l, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "3px" }}>• {l}</div>)}</div>}
          {d.certifications.length > 0 && <div style={{ flex: 1 }}><div style={{ fontSize: "12px", fontWeight: "bold", color: "#111827", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>CERTIFICATIONS</div>{d.certifications.map((c, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "3px" }}>• {c}</div>)}</div>}
        </div>
      </div>
    );
  }

  if (template === "creative") {
    return (
      <div style={{ fontFamily: "Arial, sans-serif", minHeight: "297mm", width: "210mm", margin: "0 auto", background: "#fff", boxShadow: "0 4px 32px rgba(0,0,0,0.12)" }}>
        <div style={{ background: "#0d9488", padding: "28px 32px", color: "#fff", position: "relative" }}>
          <div style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px" }}>{pi.fullName}</div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", marginTop: "3px" }}>{pi.title}</div>
          <div style={{ display: "flex", gap: "16px", marginTop: "10px", flexWrap: "wrap" }}>
            {pi.email && <span style={{ fontSize: "10px", color: "#ccfbf1", background: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "20px" }}>✉ {pi.email}</span>}
            {pi.phone && <span style={{ fontSize: "10px", color: "#ccfbf1", background: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "20px" }}>📞 {pi.phone}</span>}
            {pi.location && <span style={{ fontSize: "10px", color: "#ccfbf1", background: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "20px" }}>📍 {pi.location}</span>}
          </div>
        </div>
        <div style={{ padding: "28px 32px" }}>
          {d.summary && <div style={{ marginBottom: "20px", background: "#f0fdfa", borderRadius: "8px", padding: "14px 16px", borderLeft: "4px solid #0d9488" }}><div style={{ fontSize: "11px", color: "#374151", lineHeight: 1.7 }}>{d.summary}</div></div>}
          <div style={{ display: "flex", gap: "24px" }}>
            <div style={{ flex: "0 0 60%" }}>
              {d.experience.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: "#0d9488", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "24px", height: "3px", background: "#0d9488", display: "inline-block" }} />EXPERIENCE</div>
                  {d.experience.map((e, i) => (
                    <div key={i} style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px dashed #d1fae5" }}>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#111827" }}>{e.title}</div>
                      <div style={{ fontSize: "10px", color: "#0d9488", fontWeight: "600" }}>{e.school} · {e.period}</div>
                      <div style={{ marginTop: "4px" }}>{e.description.split("\n").map((pt, j) => <div key={j} style={{ fontSize: "10px", color: "#374151", lineHeight: 1.5 }}>{pt}</div>)}</div>
                    </div>
                  ))}
                </div>
              )}
              {d.education.length > 0 && (
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: "#0d9488", marginBottom: "10px" }}>EDUCATION</div>
                  {d.education.map((e, i) => <div key={i} style={{ marginBottom: "8px" }}><div style={{ fontSize: "11px", fontWeight: "600", color: "#111827" }}>{e.degree}</div><div style={{ fontSize: "10px", color: "#6b7280" }}>{e.institution} · {e.year}</div></div>)}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              {d.skills.length > 0 && <div style={{ marginBottom: "18px" }}><div style={{ fontSize: "11px", fontWeight: "700", color: "#f59e0b", marginBottom: "8px" }}>✦ SKILLS</div><div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>{d.skills.map((s, i) => <span key={i} style={{ fontSize: "9px", background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: "20px" }}>{s}</span>)}</div></div>}
              {d.subjects && d.subjects.length > 0 && <div style={{ marginBottom: "18px" }}><div style={{ fontSize: "11px", fontWeight: "700", color: "#f59e0b", marginBottom: "8px" }}>✦ SUBJECTS</div>{d.subjects.map((s, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "3px" }}>• {s}</div>)}</div>}
              {d.languages.length > 0 && <div style={{ marginBottom: "18px" }}><div style={{ fontSize: "11px", fontWeight: "700", color: "#f59e0b", marginBottom: "8px" }}>✦ LANGUAGES</div>{d.languages.map((l, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "3px" }}>• {l}</div>)}</div>}
              {d.certifications.length > 0 && <div><div style={{ fontSize: "11px", fontWeight: "700", color: "#f59e0b", marginBottom: "8px" }}>✦ CERTS</div>{d.certifications.map((c, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "3px" }}>• {c}</div>)}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (template === "international") {
    return (
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", minHeight: "297mm", width: "210mm", margin: "0 auto", background: "#fff", padding: "36px 40px", boxShadow: "0 4px 32px rgba(0,0,0,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", paddingBottom: "20px", borderBottom: "3px solid #b45309" }}>
          <div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#111827" }}>{pi.fullName}</div>
            <div style={{ fontSize: "13px", color: "#b45309", fontWeight: "600", marginTop: "4px" }}>{pi.title}</div>
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "3px" }}>
              {pi.email && <span style={{ fontSize: "10px", color: "#6b7280" }}>✉ {pi.email}</span>}
              {pi.phone && <span style={{ fontSize: "10px", color: "#6b7280" }}>📞 {pi.phone}</span>}
              {pi.location && <span style={{ fontSize: "10px", color: "#6b7280" }}>📍 {pi.location}</span>}
            </div>
          </div>
          <div style={{ width: "80px", height: "80px", borderRadius: "8px", background: "#fef3c7", border: "3px solid #b45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "bold", color: "#b45309" }}>
            {pi.fullName.split(" ").map(n => n[0]).slice(0, 2).join("")}
          </div>
        </div>
        {d.summary && <div style={{ marginBottom: "20px" }}><div style={{ fontSize: "11px", fontWeight: "700", color: "#b45309", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px" }}>Profile</div><div style={{ fontSize: "11px", color: "#374151", lineHeight: 1.7 }}>{d.summary}</div></div>}
        <div style={{ display: "flex", gap: "28px" }}>
          <div style={{ flex: "0 0 60%" }}>
            {d.experience.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#b45309", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>Work Experience</div>
                {d.experience.map((e, i) => (
                  <div key={i} style={{ marginBottom: "14px", paddingLeft: "10px", borderLeft: "2px solid #fed7aa" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#111827" }}>{e.title}</div>
                    <div style={{ fontSize: "10px", color: "#b45309", fontWeight: "600" }}>{e.school}</div>
                    <div style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "4px" }}>{e.period}{e.location ? ` · ${e.location}` : ""}</div>
                    {e.description.split("\n").map((pt, j) => <div key={j} style={{ fontSize: "10px", color: "#374151", lineHeight: 1.5 }}>{pt}</div>)}
                  </div>
                ))}
              </div>
            )}
            {d.education.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#b45309", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>Education</div>
                {d.education.map((e, i) => <div key={i} style={{ marginBottom: "8px" }}><div style={{ fontSize: "12px", fontWeight: "600" }}>{e.degree}</div><div style={{ fontSize: "10px", color: "#6b7280" }}>{e.institution} · {e.year}</div></div>)}
              </div>
            )}
          </div>
          <div style={{ flex: 1, background: "#fffbeb", borderRadius: "8px", padding: "16px" }}>
            {d.skills.length > 0 && <div style={{ marginBottom: "14px" }}><div style={{ fontSize: "10px", fontWeight: "700", color: "#b45309", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Core Skills</div>{d.skills.map((s, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", padding: "2px 0", borderBottom: "1px solid #fde68a" }}>{s}</div>)}</div>}
            {d.languages.length > 0 && <div style={{ marginBottom: "14px" }}><div style={{ fontSize: "10px", fontWeight: "700", color: "#b45309", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Languages</div>{d.languages.map((l, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "3px" }}>{l}</div>)}</div>}
            {d.subjects && d.subjects.length > 0 && <div><div style={{ fontSize: "10px", fontWeight: "700", color: "#b45309", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Subjects</div>{d.subjects.map((s, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", marginBottom: "3px" }}>{s}</div>)}</div>}
          </div>
        </div>
      </div>
    );
  }

  // minimalist (default)
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", minHeight: "297mm", width: "210mm", margin: "0 auto", background: "#fff", padding: "48px 52px", boxShadow: "0 4px 32px rgba(0,0,0,0.12)" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "30px", fontWeight: "300", color: "#111827", letterSpacing: "-1px" }}>{pi.fullName}</div>
        <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>{pi.title}</div>
        <div style={{ height: "1px", background: "#e5e7eb", margin: "16px 0" }} />
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          {pi.email && <span style={{ fontSize: "10px", color: "#6b7280" }}>{pi.email}</span>}
          {pi.phone && <span style={{ fontSize: "10px", color: "#6b7280" }}>{pi.phone}</span>}
          {pi.location && <span style={{ fontSize: "10px", color: "#6b7280" }}>{pi.location}</span>}
        </div>
      </div>
      {d.summary && <div style={{ marginBottom: "24px" }}><div style={{ fontSize: "9px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "6px" }}>ABOUT</div><div style={{ fontSize: "11px", color: "#374151", lineHeight: 1.8 }}>{d.summary}</div></div>}
      {d.experience.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "9px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px" }}>EXPERIENCE</div>
          {d.experience.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: "16px", marginBottom: "14px" }}>
              <div style={{ flex: "0 0 100px", fontSize: "9px", color: "#9ca3af", paddingTop: "2px" }}>{e.period}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#111827" }}>{e.title}</div>
                <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: "3px" }}>{e.school}{e.location ? ` · ${e.location}` : ""}</div>
                {e.description.split("\n").map((pt, j) => <div key={j} style={{ fontSize: "10px", color: "#374151", lineHeight: 1.6 }}>{pt}</div>)}
              </div>
            </div>
          ))}
        </div>
      )}
      {d.education.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "9px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px" }}>EDUCATION</div>
          {d.education.map((e, i) => <div key={i} style={{ display: "flex", gap: "16px", marginBottom: "10px" }}><div style={{ flex: "0 0 100px", fontSize: "9px", color: "#9ca3af", paddingTop: "2px" }}>{e.year}</div><div><div style={{ fontSize: "12px", fontWeight: "600", color: "#111827" }}>{e.degree}</div><div style={{ fontSize: "10px", color: "#6b7280" }}>{e.institution}</div></div></div>)}
        </div>
      )}
      <div style={{ display: "flex", gap: "32px" }}>
        {d.skills.length > 0 && <div style={{ flex: 1 }}><div style={{ fontSize: "9px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>SKILLS</div>{d.skills.map((s, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", padding: "2px 0", borderBottom: "1px solid #f3f4f6" }}>{s}</div>)}</div>}
        {d.languages.length > 0 && <div style={{ flex: 1 }}><div style={{ fontSize: "9px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>LANGUAGES</div>{d.languages.map((l, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", padding: "2px 0", borderBottom: "1px solid #f3f4f6" }}>{l}</div>)}</div>}
        {d.certifications.length > 0 && <div style={{ flex: 1 }}><div style={{ fontSize: "9px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>CERTS</div>{d.certifications.map((c, i) => <div key={i} style={{ fontSize: "10px", color: "#374151", padding: "2px 0", borderBottom: "1px solid #f3f4f6" }}>{c}</div>)}</div>}
      </div>
    </div>
  );
}

// ─── Certificate Renderers ────────────────────────────────────────────────────
function CertPreview({ result }: { result: CertResult }) {
  const { certContent: cc, studentName, teacherName, schoolName, date, template, course } = result;
  const colors: Record<string, [string, string]> = {
    achievement: ["#f59e0b", "#92400e"],
    excellence:  ["#7c3aed", "#4c1d95"],
    participation: ["#0284c7", "#075985"],
    completion: ["#16a34a", "#14532d"],
  };
  const [accent, dark] = colors[template] || ["#7c3aed", "#4c1d95"];

  return (
    <div style={{ fontFamily: "'Georgia', serif", width: "280mm", height: "200mm", margin: "0 auto", background: "#fff", border: `8px solid ${accent}`, borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 48px", position: "relative", boxShadow: "0 8px 48px rgba(0,0,0,0.15)", textAlign: "center" }}>
      <div style={{ position: "absolute", top: "16px", left: "16px", right: "16px", bottom: "16px", border: `2px solid ${accent}`, borderRadius: "4px", opacity: 0.3, pointerEvents: "none" }} />
      <div style={{ fontSize: "13px", color: accent, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "8px" }}>BrightBoard Teacher Studio</div>
      {schoolName && <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "16px" }}>{schoolName}</div>}
      <div style={{ fontSize: "28px", fontWeight: "bold", color: dark, letterSpacing: "1px", marginBottom: "4px" }}>{cc.title}</div>
      <div style={{ fontSize: "13px", color: accent, fontStyle: "italic", marginBottom: "20px" }}>{cc.subtitle}</div>
      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>This is to certify that</div>
      <div style={{ fontSize: "32px", fontWeight: "300", color: dark, borderBottom: `2px solid ${accent}`, paddingBottom: "8px", marginBottom: "12px", minWidth: "200px" }}>{studentName}</div>
      <div style={{ fontSize: "11px", color: "#374151", lineHeight: 1.7, maxWidth: "400px", marginBottom: "20px" }}>{cc.body}</div>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-end", marginTop: "8px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: `1px solid ${accent}`, paddingTop: "6px", fontSize: "11px", color: "#374151" }}>{teacherName}</div>
          <div style={{ fontSize: "10px", color: "#9ca3af" }}>{cc.signatureTitle}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: accent, fontWeight: "bold", marginBottom: "2px" }}>{course}</div>
          <div style={{ fontSize: "10px", color: "#9ca3af" }}>{date}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Download Helper ──────────────────────────────────────────────────────────
function downloadPreviewAsPDF(containerId: string, fileName: string) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const html = el.innerHTML;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#fff;} @media print{@page{size:A4;margin:0;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); }, 600);
}

function downloadCertAsPDF(containerId: string, fileName: string) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const html = el.innerHTML;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;} @media print{@page{size:A4 landscape;margin:0;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); }, 600);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudioPage() {
  const { isAuthenticated } = useAuth();
  const { isPremium } = useSubscription();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("cv");

  // CV Builder state
  const [cvTemplate, setCvTemplate] = useState("modern");
  const [cvStep, setCvStep] = useState<"template" | "input" | "preview">("template");
  const [cvInputMode, setCvInputMode] = useState<"form" | "upload">("form");
  const [cvForm, setCvForm] = useState({ fullName: "", email: "", phone: "", location: "", summary: "", experience: "", education: "", skills: "", languages: "", subjects: "" });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedText, setUploadedText] = useState("");
  const [cvData, setCvData] = useState<CVData | null>(null);
  const cvPreviewRef = useRef<HTMLDivElement>(null);

  // Certificate state
  const [certTemplate, setCertTemplate] = useState("achievement");
  const [certStep, setCertStep] = useState<"template" | "form" | "preview">("template");
  const [certForm, setCertForm] = useState({ studentName: "", course: "", achievement: "", teacherName: "", schoolName: "", date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) });
  const [certResult, setCertResult] = useState<CertResult | null>(null);

  const { data: usageData } = useQuery<{ cvCount: number; certCount: number; isPremium: boolean; freeLimit: number }>({
    queryKey: ["/api/studio/usage"],
    enabled: isAuthenticated,
  });

  const cvMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/studio/cv", { formData: cvForm, uploadedText, template: cvTemplate });
      return res.json();
    },
    onSuccess: (data) => {
      setCvData(data.cvData);
      setCvStep("preview");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to generate CV", variant: "destructive" });
    },
  });

  const certMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/studio/certificate", { ...certForm, template: certTemplate });
      return res.json();
    },
    onSuccess: (data) => {
      setCertResult(data);
      setCertStep("preview");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to generate certificate", variant: "destructive" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    if (file.type === "text/plain") {
      const text = await file.text();
      setUploadedText(text);
    } else if (file.type.startsWith("image/") || file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b64 = (ev.target?.result as string).split(",")[1];
        setUploadedText(`[File uploaded: ${file.name} — AI will extract text from this image/PDF]`);
      };
      reader.readAsDataURL(file);
    }
    toast({ title: "File ready", description: `${file.name} will be processed by AI` });
  };

  const cvLimitReached = !isPremium && (usageData?.cvCount ?? 0) >= 1;
  const certLimitReached = !isPremium && (usageData?.certCount ?? 0) >= 1;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-teal-600 text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
          <div className="relative container mx-auto px-4 py-16 text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" /> Free for all teachers
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Teacher Studio</h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Your professional toolkit — build polished CVs, print student certificates, design school logos, and convert files. All powered by AI, all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-white text-purple-700 hover:bg-white/90 font-bold text-base px-8 shadow-lg" data-testid="button-studio-signup">
                <Link href="/signup">Get Started Free <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold text-base px-8" data-testid="button-studio-login">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
            <p className="text-white/60 text-sm mt-4">No credit card required &bull; 1 free CV &amp; certificate per month</p>
          </div>
        </div>

        {/* Features */}
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-2">Everything a teacher needs</h2>
          <p className="text-muted-foreground text-center mb-10">Four powerful tools, zero design skills required.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <FileText className="w-7 h-7 text-purple-600" />,
                bg: "bg-purple-50 dark:bg-purple-950/30",
                title: "CV Builder",
                badge: "1 free/month",
                badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
                desc: "Pick from 6 professional teacher CV templates. Fill a simple form or upload your old CV — AI writes polished bullet points and formats everything for you.",
                points: ["Academic Pro, Modern Educator & more", "AI-written summaries & experience bullets", "Print-ready PDF download"],
              },
              {
                icon: <Award className="w-7 h-7 text-amber-600" />,
                bg: "bg-amber-50 dark:bg-amber-950/30",
                title: "Certificate Maker",
                badge: "1 free/month",
                badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
                desc: "Award students in seconds. Choose an Achievement, Excellence, Participation, or Completion certificate. AI writes the wording — you just print.",
                points: ["4 beautiful templates", "AI-generated personalised wording", "Instant print or PDF download"],
              },
              {
                icon: <Palette className="w-7 h-7 text-teal-600" />,
                bg: "bg-teal-50 dark:bg-teal-950/30",
                title: "Logo Designer",
                badge: "Free",
                badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
                desc: "Create a unique logo for your school, class, or department. Describe your style and AI generates a professional logo in seconds — no design skills needed.",
                points: ["Describe your vision in plain English", "Multiple style options", "Download as PNG/SVG"],
              },
              {
                icon: <FolderOpen className="w-7 h-7 text-blue-600" />,
                bg: "bg-blue-50 dark:bg-blue-950/30",
                title: "File Converter",
                badge: "Free",
                badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                desc: "Convert documents between PDF, JPEG, and PNG instantly — right in your browser. No uploads to third-party sites, no waiting, completely private.",
                points: ["PDF ↔ JPEG ↔ PNG", "Runs entirely in your browser", "Completely private — no uploads"],
              },
            ].map((f) => (
              <Card key={f.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6 pb-6 space-y-3">
                  <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center`}>{f.icon}</div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">{f.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.badgeColor}`}>{f.badge}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  <ul className="space-y-1">
                    {f.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-muted/40 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-2">How it works</h2>
            <p className="text-muted-foreground text-center mb-10">Three steps from blank page to finished document.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              {[
                { step: "1", icon: <User className="w-6 h-6 text-purple-600" />, title: "Create your free account", desc: "Sign up in under 30 seconds — just your email and a password. No credit card, no commitments." },
                { step: "2", icon: <Sparkles className="w-6 h-6 text-teal-600" />, title: "Choose a tool & template", desc: "Pick the CV, certificate, logo, or file converter. Select a template and fill in a short form." },
                { step: "3", icon: <Download className="w-6 h-6 text-amber-600" />, title: "Download & use", desc: "AI generates your professional document in seconds. Download, print, or share — done." },
              ].map((s) => (
                <div key={s.step} className="text-center space-y-3">
                  <div className="relative inline-flex">
                    <div className="w-14 h-14 rounded-full bg-white dark:bg-card border-2 border-border shadow flex items-center justify-center">
                      {s.icon}
                    </div>
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">{s.step}</span>
                  </div>
                  <h3 className="font-bold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing strip */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Simple, fair pricing</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="border-border">
                <CardContent className="pt-6 pb-6 text-center space-y-3">
                  <div className="text-3xl font-black">Free</div>
                  <div className="text-muted-foreground text-sm">For every teacher</div>
                  <ul className="space-y-2 text-sm text-left mt-4">
                    {["1 CV per month", "1 certificate per month", "Logo designer — unlimited", "File converter — unlimited"].map(i => (
                      <li key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" />{i}</li>
                    ))}
                  </ul>
                  <Button asChild className="w-full mt-4 bg-gradient-to-r from-purple-600 to-teal-500" data-testid="button-studio-free-cta">
                    <Link href="/signup">Start for free</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-950/30 dark:to-teal-950/30">
                <CardContent className="pt-6 pb-6 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <div className="text-3xl font-black">Premium</div>
                  </div>
                  <div className="text-muted-foreground text-sm">From $4.99/week</div>
                  <ul className="space-y-2 text-sm text-left mt-4">
                    {["Unlimited CVs every month", "Unlimited certificates", "All BrightBoard AI tools", "HD quality & priority generation"].map(i => (
                      <li key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-600 shrink-0" />{i}</li>
                    ))}
                  </ul>
                  <Button asChild className="w-full mt-4 bg-gradient-to-r from-purple-600 to-teal-500" data-testid="button-studio-premium-cta">
                    <Link href="/pricing">See pricing</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="bg-gradient-to-r from-purple-600 to-teal-600 py-12 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to save hours every week?</h2>
          <p className="text-white/80 mb-6">Join thousands of teachers who already use BrightBoard to create professional materials in minutes.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-white text-purple-700 hover:bg-white/90 font-bold" data-testid="button-studio-final-signup">
              <Link href="/signup">Create free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold" data-testid="button-studio-final-login">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-teal-600 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><Sparkles className="w-6 h-6" /></div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Teacher Studio</h1>
              <p className="text-purple-200 text-sm">Your complete professional toolkit</p>
            </div>
            {isPremium && <Badge className="ml-auto bg-amber-400 text-amber-900 font-bold"><Crown className="w-3 h-3 mr-1" />Premium</Badge>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { icon: FileText,  label: "CV Builder",      desc: "Professional teacher resumes",   tab: "cv" },
              { icon: Award,     label: "Certificates",    desc: "Student award certificates",     tab: "cert" },
              { icon: Palette,   label: "Logo Designer",   desc: "School & class logos",           tab: "logo" },
              { icon: FolderOpen,label: "File Converter",  desc: "PDF, PNG, JPG & more",           tab: "files" },
            ].map(({ icon: Icon, label, desc, tab }) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`p-3 rounded-xl text-left transition-all ${activeTab === tab ? "bg-white text-purple-700" : "bg-white/10 hover:bg-white/20 text-white"}`}>
                <Icon className="w-5 h-5 mb-1" />
                <div className="font-bold text-sm">{label}</div>
                <div className={`text-xs ${activeTab === tab ? "text-purple-500" : "text-purple-200"}`}>{desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl">

        {/* ── CV Builder ── */}
        {activeTab === "cv" && (
          <div>
            {/* Usage badge */}
            {!isPremium && (
              <div className="mb-6 flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-amber-800 dark:text-amber-200">Free plan:</span>
                  <span className="text-amber-700 dark:text-amber-300"> {usageData?.cvCount ?? 0} of 1 free CV generated this month.</span>
                </div>
                {cvLimitReached && <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"><Link href="/pricing"><Crown className="w-3 h-3 mr-1" />Upgrade</Link></Button>}
              </div>
            )}

            {/* Step: Template */}
            {cvStep === "template" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-1">Choose Your CV Template</h2>
                  <p className="text-muted-foreground">6 teacher-specific designs. Click one to select it.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {CV_TEMPLATES.map((tmpl) => (
                    <button key={tmpl.id} onClick={() => setCvTemplate(tmpl.id)} className={`relative rounded-2xl border-2 overflow-hidden text-left transition-all hover:shadow-lg ${cvTemplate === tmpl.id ? "border-purple-500 shadow-lg shadow-purple-100 dark:shadow-purple-900/30" : "border-border hover:border-purple-300"}`}>
                      <div style={{ background: tmpl.bg, height: "80px" }} className="flex items-center justify-center">
                        <div className="text-white text-center px-4">
                          <div className="font-bold text-sm">{tmpl.name}</div>
                          <div className="mt-2 flex gap-1 justify-center">
                            <div style={{ background: "rgba(255,255,255,0.4)", height: "6px", width: "40px", borderRadius: "3px" }} />
                            <div style={{ background: "rgba(255,255,255,0.25)", height: "6px", width: "25px", borderRadius: "3px" }} />
                          </div>
                          <div className="mt-1 flex gap-1 justify-center">
                            <div style={{ background: "rgba(255,255,255,0.2)", height: "4px", width: "55px", borderRadius: "2px" }} />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-card">
                        <div className="font-semibold text-sm">{tmpl.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{tmpl.desc}</div>
                      </div>
                      {cvTemplate === tmpl.id && <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700" onClick={() => setCvStep("input")}>
                    Continue with {CV_TEMPLATES.find(t => t.id === cvTemplate)?.name} <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Input */}
            {cvStep === "input" && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Button variant="outline" size="sm" onClick={() => setCvStep("template")}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                  <h2 className="text-2xl font-bold">Your Details</h2>
                  <Badge variant="outline" className="ml-auto">{CV_TEMPLATES.find(t => t.id === cvTemplate)?.name}</Badge>
                </div>

                <div className="flex gap-3 mb-6">
                  <Button variant={cvInputMode === "form" ? "default" : "outline"} onClick={() => setCvInputMode("form")} className="gap-2"><User className="w-4 h-4" />Fill in Form</Button>
                  <Button variant={cvInputMode === "upload" ? "default" : "outline"} onClick={() => setCvInputMode("upload")} className="gap-2"><Upload className="w-4 h-4" />Upload Existing CV</Button>
                </div>

                {cvInputMode === "form" && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-purple-500" />Personal Information</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div><Label>Full Name *</Label><Input placeholder="e.g. Sarah Johnson" value={cvForm.fullName} onChange={e => setCvForm(f => ({ ...f, fullName: e.target.value }))} data-testid="input-cv-name" /></div>
                        <div><Label>Email</Label><Input placeholder="sarah@school.edu" value={cvForm.email} onChange={e => setCvForm(f => ({ ...f, email: e.target.value }))} data-testid="input-cv-email" /></div>
                        <div><Label>Phone</Label><Input placeholder="+1 (555) 123-4567" value={cvForm.phone} onChange={e => setCvForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-cv-phone" /></div>
                        <div><Label>Location</Label><Input placeholder="City, Country" value={cvForm.location} onChange={e => setCvForm(f => ({ ...f, location: e.target.value }))} data-testid="input-cv-location" /></div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-teal-500" />Teaching Profile</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div><Label>Summary / Bio</Label><Textarea placeholder="Brief description of your teaching background..." className="h-20" value={cvForm.summary} onChange={e => setCvForm(f => ({ ...f, summary: e.target.value }))} data-testid="input-cv-summary" /></div>
                        <div><Label>Subjects Taught</Label><Input placeholder="e.g. Math, Science, English" value={cvForm.subjects} onChange={e => setCvForm(f => ({ ...f, subjects: e.target.value }))} /></div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-500" />Work Experience</CardTitle></CardHeader>
                      <CardContent>
                        <Textarea placeholder="List your teaching positions, schools, years, and key achievements. The AI will structure and enhance everything professionally." className="h-32" value={cvForm.experience} onChange={e => setCvForm(f => ({ ...f, experience: e.target.value }))} data-testid="input-cv-experience" />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4 text-green-500" />Education & Qualifications</CardTitle></CardHeader>
                      <CardContent>
                        <Textarea placeholder="Degrees, institutions, years, and any honors. e.g. B.Ed. Mathematics — University of Nairobi — 2018 — First Class Honours" className="h-32" value={cvForm.education} onChange={e => setCvForm(f => ({ ...f, education: e.target.value }))} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Skills</CardTitle></CardHeader>
                      <CardContent>
                        <Textarea placeholder="e.g. Classroom management, Google Classroom, IB curriculum, Differentiated instruction..." className="h-24" value={cvForm.skills} onChange={e => setCvForm(f => ({ ...f, skills: e.target.value }))} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-orange-500" />Languages & Certifications</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div><Label>Languages</Label><Input placeholder="e.g. English (Native), French (Fluent)" value={cvForm.languages} onChange={e => setCvForm(f => ({ ...f, languages: e.target.value }))} /></div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {cvInputMode === "upload" && (
                  <Card className="max-w-lg mx-auto">
                    <CardContent className="pt-6 text-center">
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-bold text-lg mb-2">Upload Your Existing CV</h3>
                      <p className="text-muted-foreground text-sm mb-6">Upload a PDF, image (photo), or text file. The AI reads all the text, extracts your info, and rewrites it professionally.</p>
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-border rounded-xl p-8 hover:border-purple-400 transition-colors">
                          {uploadedFile ? (
                            <div className="text-center"><Check className="w-8 h-8 text-green-500 mx-auto mb-2" /><div className="font-semibold">{uploadedFile.name}</div><div className="text-sm text-muted-foreground">Ready to enhance</div></div>
                          ) : (
                            <div className="text-muted-foreground">Click to select file · PDF, JPG, PNG, TXT · Max 20MB</div>
                          )}
                        </div>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.txt" onChange={handleFileUpload} data-testid="input-cv-upload" />
                      </label>
                      {uploadedFile && (
                        <div className="mt-4">
                          <Label className="text-left block mb-2">Add any extra details (optional)</Label>
                          <Textarea placeholder="e.g. I want to target international school jobs in the Middle East..." className="h-24" value={uploadedText} onChange={e => setUploadedText(e.target.value)} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end mt-8">
                  {cvLimitReached ? (
                    <Button asChild size="lg" className="gap-2 bg-amber-500 hover:bg-amber-600"><Link href="/pricing"><Crown className="w-4 h-4" />Upgrade to Generate</Link></Button>
                  ) : (
                    <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700" onClick={() => cvMutation.mutate()} disabled={cvMutation.isPending || (!cvForm.fullName && !uploadedFile)} data-testid="button-generate-cv">
                      {cvMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Generating your CV…</> : <><Sparkles className="w-4 h-4" />Generate Professional CV</>}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step: Preview */}
            {cvStep === "preview" && cvData && (
              <div>
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setCvStep("input")}><ChevronLeft className="w-4 h-4 mr-1" />Edit Details</Button>
                  <h2 className="text-2xl font-bold">Your Professional CV</h2>
                  <div className="ml-auto flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => { setCvData(null); setCvStep("template"); setCvForm({ fullName: "", email: "", phone: "", location: "", summary: "", experience: "", education: "", skills: "", languages: "", subjects: "" }); }}><RefreshCw className="w-4 h-4 mr-1" />Start Over</Button>
                    <Button variant="outline" size="sm" onClick={() => downloadPreviewAsPDF("cv-print-area", `CV-${cvData.personalInfo.fullName || "Teacher"}.pdf`)} data-testid="button-download-cv-pdf"><Printer className="w-4 h-4 mr-1" />Print / Save PDF</Button>
                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-teal-600" onClick={() => {
                      const el = document.getElementById("cv-print-area");
                      if (!el) return;
                      const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#fff;}</style></head><body>${el.innerHTML}</body></html>`], { type: "text/html" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = `CV-${cvData.personalInfo.fullName || "Teacher"}.html`; a.click();
                    }} data-testid="button-download-cv-html"><Download className="w-4 h-4 mr-1" />Download HTML</Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {CV_TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setCvTemplate(t.id)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${cvTemplate === t.id ? "bg-purple-600 text-white border-purple-600" : "border-border hover:border-purple-300 text-muted-foreground"}`}>{t.name}</button>
                  ))}
                </div>
                <div className="overflow-auto bg-gray-100 dark:bg-gray-900 rounded-2xl p-4">
                  <div id="cv-print-area">
                    <CVPreview data={cvData} template={cvTemplate} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">Tip: Use "Print / Save PDF" → choose "Save as PDF" in the print dialog for the best quality.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Certificates ── */}
        {activeTab === "cert" && (
          <div>
            {!isPremium && (
              <div className="mb-6 flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="flex-1"><span className="font-semibold text-amber-800 dark:text-amber-200">Free plan:</span><span className="text-amber-700 dark:text-amber-300"> {usageData?.certCount ?? 0} of 1 free certificate generated this month.</span></div>
                {certLimitReached && <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"><Link href="/pricing"><Crown className="w-3 h-3 mr-1" />Upgrade</Link></Button>}
              </div>
            )}

            {certStep === "template" && (
              <div>
                <div className="mb-6"><h2 className="text-2xl font-bold mb-1">Choose Certificate Template</h2><p className="text-muted-foreground">4 styles for every student achievement.</p></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {CERT_TEMPLATES.map((tmpl) => (
                    <button key={tmpl.id} onClick={() => setCertTemplate(tmpl.id)} className={`rounded-2xl border-2 overflow-hidden text-left transition-all hover:shadow-lg ${certTemplate === tmpl.id ? "border-purple-500 shadow-lg" : "border-border hover:border-purple-300"}`}>
                      <div style={{ background: `linear-gradient(135deg, ${tmpl.colors[0]}, ${tmpl.colors[1]})`, height: "100px" }} className="flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl mb-1">{tmpl.icon}</div>
                          <div className="text-white font-bold text-xs">{tmpl.name}</div>
                        </div>
                      </div>
                      <div className="p-3 bg-card">
                        <div className="font-semibold text-sm">{tmpl.name}</div>
                        <div className="text-xs text-muted-foreground">{tmpl.desc}</div>
                      </div>
                      {certTemplate === tmpl.id && <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-0.5" style={{ position: "absolute" }}></div>}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-600 to-teal-600" onClick={() => setCertStep("form")}>Fill Certificate Details <ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {certStep === "form" && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Button variant="outline" size="sm" onClick={() => setCertStep("template")}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                  <h2 className="text-2xl font-bold">Certificate Details</h2>
                </div>
                <div className="max-w-2xl mx-auto">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Student Name *</Label><Input placeholder="e.g. Amara Diallo" value={certForm.studentName} onChange={e => setCertForm(f => ({ ...f, studentName: e.target.value }))} data-testid="input-cert-student" /></div>
                        <div><Label>Course / Subject *</Label><Input placeholder="e.g. Mathematics Grade 5" value={certForm.course} onChange={e => setCertForm(f => ({ ...f, course: e.target.value }))} data-testid="input-cert-course" /></div>
                      </div>
                      <div><Label>Achievement Description</Label><Input placeholder="e.g. Outstanding performance and dedication to learning" value={certForm.achievement} onChange={e => setCertForm(f => ({ ...f, achievement: e.target.value }))} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Your Name (Teacher)</Label><Input placeholder="e.g. Mr. James Otieno" value={certForm.teacherName} onChange={e => setCertForm(f => ({ ...f, teacherName: e.target.value }))} data-testid="input-cert-teacher" /></div>
                        <div><Label>School Name</Label><Input placeholder="e.g. Sunrise Academy" value={certForm.schoolName} onChange={e => setCertForm(f => ({ ...f, schoolName: e.target.value }))} /></div>
                      </div>
                      <div><Label>Date</Label><Input value={certForm.date} onChange={e => setCertForm(f => ({ ...f, date: e.target.value }))} /></div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-end mt-6">
                    {certLimitReached ? (
                      <Button asChild size="lg" className="gap-2 bg-amber-500"><Link href="/pricing"><Crown className="w-4 h-4" />Upgrade to Generate</Link></Button>
                    ) : (
                      <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-600 to-teal-600" onClick={() => certMutation.mutate()} disabled={certMutation.isPending || !certForm.studentName || !certForm.course} data-testid="button-generate-cert">
                        {certMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating Certificate…</> : <><Sparkles className="w-4 h-4" />Create Certificate</>}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {certStep === "preview" && certResult && (
              <div>
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setCertStep("form")}><ChevronLeft className="w-4 h-4 mr-1" />Edit</Button>
                  <h2 className="text-2xl font-bold">Certificate Preview</h2>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setCertResult(null); setCertStep("template"); setCertForm({ studentName: "", course: "", achievement: "", teacherName: "", schoolName: "", date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) }); }}><RefreshCw className="w-4 h-4 mr-1" />New Certificate</Button>
                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-teal-600" onClick={() => downloadCertAsPDF("cert-print-area", `Certificate-${certResult.studentName}.pdf`)} data-testid="button-download-cert"><Printer className="w-4 h-4 mr-1" />Print / Save PDF</Button>
                  </div>
                </div>
                <div className="overflow-auto bg-gray-100 dark:bg-gray-900 rounded-2xl p-4">
                  <div id="cert-print-area">
                    <CertPreview result={certResult} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Logo Designer ── */}
        {activeTab === "logo" && (
          <div>
            <div className="mb-6"><h2 className="text-2xl font-bold mb-1">Logo Designer</h2><p className="text-muted-foreground">Create a professional logo for your school, class, or department using AI.</p></div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-purple-500" />AI Logo Generator</CardTitle>
                  <CardDescription>Describe your school or class and our AI will generate logo options in different styles — Modern, Playful, Academic, Minimalist, and Creative.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 opacity-70">
                      {["Modern & Clean ✨", "Playful & Fun 🎨", "Academic 📚", "Minimalist ◻️", "Creative 🚀", "Any Style"].map(style => (
                        <div key={style} className="text-xs bg-muted rounded-lg p-2 text-center">{style}</div>
                      ))}
                    </div>
                    <LogoSettings />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-teal-500" />Upload Existing Logo</CardTitle>
                  <CardDescription>Already have a logo? Upload it to use across all your BrightBoard content — presentations, worksheets, and certificates.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground text-sm">Use the Logo Settings button above to upload an existing logo or generate a new one with AI.</div>
                    <div className="bg-muted/50 rounded-xl p-4 text-sm">
                      <div className="font-semibold mb-1">Where your logo appears:</div>
                      <div className="space-y-1 text-muted-foreground text-xs">
                        <div>✓ All generated presentations</div>
                        <div>✓ Educational worksheets</div>
                        <div>✓ Video storyboards</div>
                        <div>✓ Certificates (Teacher Studio)</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── File Converter ── */}
        {activeTab === "files" && (
          <div>
            <div className="mb-6"><h2 className="text-2xl font-bold mb-1">File Converter</h2><p className="text-muted-foreground">Convert between PDF, JPG, PNG, and more formats instantly.</p></div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-teal-200 dark:border-teal-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-teal-500" />Quick Converter</CardTitle>
                  <CardDescription>Convert PDF to image, image to PDF, JPG to PNG, and more — up to 20MB per file.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { from: "JPG", to: "PDF", icon: "🖼→📄" }, { from: "PNG", to: "PDF", icon: "🖼→📄" },
                      { from: "JPG", to: "PNG", icon: "🖼→🖼" }, { from: "PDF", to: "PNG", icon: "📄→🖼" },
                    ].map(c => (
                      <div key={`${c.from}-${c.to}`} className="flex items-center gap-2 bg-muted rounded-xl p-3 text-sm">
                        <span className="text-lg">{c.icon}</span>
                        <span className="font-medium">{c.from} → {c.to}</span>
                      </div>
                    ))}
                  </div>
                  <FileConverter />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-500" />Advanced File Tools</CardTitle>
                  <CardDescription>Need to merge PDFs, compress files, or convert to PowerPoint? Use the full File Tools page.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Merge multiple PDFs into one", icon: "📑" },
                      { label: "Compress PDF / reduce file size", icon: "📦" },
                      { label: "Convert image to PowerPoint", icon: "📊" },
                      { label: "Batch convert up to 10 files", icon: "⚡" },
                    ].map(f => (
                      <div key={f.label} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="text-base">{f.icon}</span>{f.label}
                      </div>
                    ))}
                    <Button asChild variant="outline" className="w-full mt-2 gap-2">
                      <Link href="/file-tools"><FolderOpen className="w-4 h-4" />Open Full File Tools Page <ArrowRight className="w-4 h-4" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
}
