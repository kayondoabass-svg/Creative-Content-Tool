import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, BookOpen, Building2, Check, FileCheck, FileImage, FileText, Globe2, GraduationCap, Heart, Lightbulb, MapPin, Network, Presentation, Shapes, Sparkles, Target, UserRound } from "lucide-react";

const lessonTypes = [
  { icon: FileImage, title: "about.offerImages", desc: "about.offerImagesDesc", fallback: "Educational images", detail: "Generate illustrations, diagrams and visual aids shaped around a subject and age group." },
  { icon: Presentation, title: "about.offerPresentations", desc: "about.offerPresentationsDesc", fallback: "Presentations", detail: "Build lesson slide decks with speaker notes and export options." },
  { icon: FileText, title: "about.offerText", desc: "about.offerTextDesc", fallback: "Text materials", detail: "Draft stories, explanations, lesson plans and other classroom-ready writing." },
  { icon: Shapes, title: "about.offerGames", desc: "about.offerGamesDesc", fallback: "Activities & games", detail: "Create interactive classroom activities and playable learning games." },
  { icon: BookOpen, title: "about.offerVideos", desc: "about.offerVideosDesc", fallback: "Storyboards", detail: "Plan animated video storyboards with narration and subtitles." },
  { icon: FileCheck, title: "about.offerWorksheets", desc: "about.offerWorksheetsDesc", fallback: "Worksheets", detail: "Prepare printable practice materials with varied question types." },
  { icon: Network, title: "about.offerMindmaps", desc: "about.offerMindmapsDesc", fallback: "Mind maps", detail: "Arrange a lesson idea into a visual map of connected concepts." },
];
const studioTools = [
  { icon: UserRound, title: "about.cvBuilder", detail: "about.cvBuilderDesc", fallback: "CV Builder", text: "Create and export a professional teaching CV." },
  { icon: Award, title: "about.certificates", detail: "about.certificatesDesc", fallback: "Certificates", text: "Prepare student certificates for recognition and completion." },
  { icon: Sparkles, title: "about.logoDesigner", detail: "about.logoDesignerDesc", fallback: "Logo Designer", text: "Design a school or classroom logo." },
  { icon: FileText, title: "about.fileConverter", detail: "about.fileConverterDesc", fallback: "File Converter", text: "Convert supported classroom and office file formats." },
  { icon: Check, title: "about.reportCards", detail: "about.reportCardsDesc", fallback: "Report Cards", text: "Organize learner ratings and comments into report cards." },
];

export default function About() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  return (
    <div className="page-shell min-h-screen flex flex-col">
      <main className="bb-page flex-1 py-8 md:py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8" data-testid="button-back-home">
          <ArrowLeft className="w-4 h-4" />{tr("about.backHome", "Back to Home")}
        </Link>
        <header className="bb-surface relative overflow-hidden p-7 md:p-12 mb-7">
          <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative max-w-3xl">
            <div className="flex items-center gap-3 mb-7">
              <img src="/favicon.png" alt="BrightBoard" className="w-12 h-12 rounded-xl object-cover" data-testid="img-about-logo" />
              <span className="bb-eyebrow">BrightBoard · Keyo Technologies</span>
            </div>
            <h1 className="bb-display text-4xl md:text-6xl font-extrabold leading-[1.04] mb-5" data-testid="text-about-title">{tr("about.title", "About BrightBoard")}</h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">{tr("about.subtitle", "Practical creative tools for teachers, from classroom materials to everyday professional paperwork.")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-2 text-sm text-primary"><Globe2 className="w-4 h-4" />{tr("about.globalTitle", "Built with a global perspective")}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3.5 py-2 text-sm text-accent"><MapPin className="w-4 h-4" />Kampala, Uganda</span>
            </div>
          </div>
        </header>

        <section className="grid md:grid-cols-[.82fr_1.18fr] gap-5 mb-7">
          <article className="bb-surface p-7 md:p-8">
            <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent grid place-items-center mb-5"><Target className="w-5 h-5" /></div>
            <p className="bb-eyebrow mb-2">{tr("about.missionTitle", "Our mission")}</p>
            <p className="text-lg leading-relaxed">{tr("about.missionText", "BrightBoard exists to give every teacher access to professional-quality educational content creation tools. When teachers save time preparing content, they can invest more energy in inspiring and engaging their students.")}</p>
          </article>
          <article className="rounded-2xl bg-primary text-primary-foreground p-7 md:p-8 shadow-md">
            <div className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center mb-5"><Lightbulb className="w-5 h-5" /></div>
            <p className="text-xs uppercase tracking-[.15em] font-bold text-primary-foreground/70 mb-2">{tr("about.storyTitle", "The idea")}</p>
            <p className="text-xl md:text-2xl font-semibold leading-relaxed mb-4">{tr("about.storyText1", "BrightBoard began with a practical observation: teachers spend long hours creating materials, often outside the school day.")}</p>
            <p className="text-primary-foreground/80 leading-relaxed">{tr("about.storyText2", "Founded in Uganda, BrightBoard is designed with an international perspective and supports educators across different settings and languages.")}</p>
          </article>
        </section>

        <section className="mb-12">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div><p className="bb-eyebrow mb-2">{tr("about.whatWeOfferTitle", "What BrightBoard does")}</p><h2 className="bb-display text-3xl md:text-4xl font-extrabold">{tr("about.classroomMaterialsTitle", "Classroom materials, ready to shape")}</h2></div>
            <Link href="/features" className="hidden sm:inline-flex text-sm text-primary font-semibold items-center gap-2">{tr("about.exploreFeatures", "Explore features")} <ArrowLeft className="w-4 h-4 rotate-180 rtl:rotate-0" /></Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {lessonTypes.map(({ icon: Icon, title, desc, fallback, detail }, i) => (
              <article key={title} className={`bb-surface bb-rise p-5 ${i === 0 ? "lg:col-span-2 lg:p-7" : ""}`}>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4"><Icon className="w-5 h-5" /></div>
                <h3 className="font-bold text-lg mb-2">{tr(title, fallback)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{tr(desc, detail)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-secondary/70 border border-border p-6 md:p-9 mb-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div><p className="bb-eyebrow mb-2">Teacher Studio</p><h2 className="bb-display text-3xl md:text-4xl font-extrabold">{tr("about.studioTitle", "The work around the lesson")}</h2></div>
            <p className="text-muted-foreground max-w-md">{tr("about.studioDesc", "Five practical tools help teachers handle professional documents and school identity alongside their classroom work.")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {studioTools.map(({ icon: Icon, title, detail, fallback, text }) => <article key={title} className="bg-card rounded-xl border border-card-border p-4">
              <Icon className="w-5 h-5 text-accent mb-4" /><h3 className="font-semibold mb-1">{tr(title, fallback)}</h3><p className="text-xs text-muted-foreground leading-relaxed">{tr(detail, text)}</p>
            </article>)}
          </div>
          <Link href="/studio" className="inline-flex mt-5 text-sm font-semibold text-primary items-center gap-2">{tr("about.openStudio", "Open Teacher Studio")} <ArrowLeft className="w-4 h-4 rotate-180 rtl:rotate-0" /></Link>
        </section>

        <section className="grid md:grid-cols-2 gap-5 mb-12">
          <article className="bb-surface p-7">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center mb-4"><UserRound className="w-5 h-5" /></div>
            <p className="bb-eyebrow mb-2">{tr("about.founderTitle", "The creator")}</p>
            <h2 className="bb-display text-3xl font-extrabold mb-1">Kayondo Abass</h2>
            <p className="text-sm text-primary font-semibold mb-4">{tr("about.founderRole", "Founder & CEO, Keyo Technologies")}</p>
            <p className="text-muted-foreground leading-relaxed">{tr("about.founderBio", "Kayondo Abass is the sole creator of BrightBoard. He holds a degree in English Language and Literature with Education, a TESOL certificate from World TESOL Academy, and a Master's in International Business Communication. His teaching experience in Hanoi, Vietnam informed his understanding of teachers' needs. He is based in Kampala, Uganda.")}</p>
          </article>
          <article className="bb-surface p-7">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4"><Building2 className="w-5 h-5" /></div>
            <p className="bb-eyebrow mb-2">{tr("about.companyTitle", "The company")}</p>
            <h2 className="bb-display text-3xl font-extrabold mb-3" data-testid="text-company-name">{tr("about.companyName", "Keyo Technologies")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-5">{tr("about.companyDesc", "BrightBoard is a product of Keyo Technologies, a registered technology company in Uganda.")}</p>
            <div className="space-y-3 pt-4 border-t">
              <div className="flex gap-3 items-start text-sm"><FileCheck className="w-4 h-4 text-primary mt-0.5" /><span data-testid="text-reg-number">{tr("about.regNumber", "Registration No: 80030812159711")}</span></div>
              <div className="flex gap-3 items-start text-sm"><FileCheck className="w-4 h-4 text-primary mt-0.5" /><span data-testid="text-reg-date">{tr("about.regDate", "Registered: 26 February 2026")}</span></div>
              <div className="flex gap-3 items-start text-sm"><MapPin className="w-4 h-4 text-primary mt-0.5" /><span>{tr("about.regLocation", "Kampala, Uganda")}</span></div>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-primary/15 bg-primary/5 p-7 md:p-9 mb-10">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10">
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-primary/10 text-primary grid place-items-center">
              <Globe2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="bb-display text-3xl font-extrabold mb-4">{t("about.globalTitle")}</h2>
              <p className="text-muted-foreground leading-relaxed max-w-3xl">{t("about.globalText")}</p>
              <ul className="flex flex-wrap gap-2 mt-5" aria-label={t("about.globalTitle")}>
                {["English", "Français", "Español", "Português", "العربية", "हिन्दी", "中文", "Tiếng Việt", "Kiswahili", "Luganda", "isiZulu"].map(language => (
                  <li key={language} className="rounded-full border border-primary/10 bg-card px-3 py-1.5 text-sm">{language}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bb-surface p-7 md:p-9 mb-10">
          <div className="flex gap-4 items-start">
            <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0"><Heart className="w-5 h-5" /></div>
            <div><p className="bb-eyebrow mb-2">{tr("about.valuesTitle", "What guides the work")}</p>
              <div className="grid md:grid-cols-3 gap-6 mt-5">
                {[
                  [GraduationCap, "about.value1Title", "Education first", "about.value1Desc", "Features are designed with teachers and learners in mind."],
                  [Globe2, "about.value2Title", "Accessibility for all", "about.value2Desc", "The goal is useful tools for educators across locations and budgets."],
                  [Lightbulb, "about.value3Title", "Innovation with purpose", "about.value3Desc", "Technology should address real everyday teaching work."],
                ].map(([Icon, title, titleFallback, desc, descFallback]: any) => <div key={title} className="border-t-2 border-primary/25 pt-4">
                  <h3 className="font-bold mb-2 flex gap-2 items-center"><Icon className="w-4 h-4 text-primary" />{tr(title, titleFallback)}</h3><p className="text-sm text-muted-foreground">{tr(desc, descFallback)}</p>
                </div>)}
              </div>
            </div>
          </div>
        </section>
        <div className="bb-surface flex flex-col sm:flex-row items-center justify-between gap-5 p-6 md:p-8">
          <div><h2 className="bb-display text-2xl font-extrabold mb-1">{tr("about.ctaTitle", "See if BrightBoard fits your work")}</h2><p className="text-muted-foreground">{tr("about.ctaExploreText", "Explore the workspace, or get in touch with a question.")}</p></div>
          <div className="flex gap-3 shrink-0">
            <Button asChild data-testid="button-about-signup"><Link href="/signup">{t("common.getStarted")}</Link></Button>
            <Button asChild variant="outline" data-testid="button-about-contact"><Link href="/contact">{tr("about.contactUs", "Contact us")}</Link></Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}