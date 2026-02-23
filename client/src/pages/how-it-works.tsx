import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, Sparkles, Download, Share2, Lightbulb, Image, Presentation, FileText, Video, FileSpreadsheet, Gamepad2, CheckCircle2, ArrowRight, GraduationCap, Clock, Zap, Globe, Shield } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

const steps = [
  { icon: UserPlus, color: "from-blue-500 to-cyan-500", titleKey: "howItWorks.step1Title", descKey: "howItWorks.step1Desc", detailKeys: ["howItWorks.step1Detail1", "howItWorks.step1Detail2", "howItWorks.step1Detail3"] },
  { icon: Lightbulb, color: "from-purple-500 to-violet-500", titleKey: "howItWorks.step2Title", descKey: "howItWorks.step2Desc", detailKeys: ["howItWorks.step2Detail1", "howItWorks.step2Detail2", "howItWorks.step2Detail3"] },
  { icon: Sparkles, color: "from-amber-500 to-orange-500", titleKey: "howItWorks.step3Title", descKey: "howItWorks.step3Desc", detailKeys: ["howItWorks.step3Detail1", "howItWorks.step3Detail2", "howItWorks.step3Detail3"] },
  { icon: Download, color: "from-green-500 to-emerald-500", titleKey: "howItWorks.step4Title", descKey: "howItWorks.step4Desc", detailKeys: ["howItWorks.step4Detail1", "howItWorks.step4Detail2", "howItWorks.step4Detail3"] },
];

const contentTypes = [
  { icon: Image, color: "from-pink-500 to-rose-500", titleKey: "howItWorks.typeImageTitle", descKey: "howItWorks.typeImageDesc", examplesKey: "howItWorks.typeImageExamples" },
  { icon: Presentation, color: "from-blue-500 to-cyan-500", titleKey: "howItWorks.typePresentationTitle", descKey: "howItWorks.typePresentationDesc", examplesKey: "howItWorks.typePresentationExamples" },
  { icon: FileText, color: "from-teal-500 to-cyan-500", titleKey: "howItWorks.typeTextTitle", descKey: "howItWorks.typeTextDesc", examplesKey: "howItWorks.typeTextExamples" },
  { icon: FileSpreadsheet, color: "from-orange-500 to-amber-500", titleKey: "howItWorks.typeWorksheetTitle", descKey: "howItWorks.typeWorksheetDesc", examplesKey: "howItWorks.typeWorksheetExamples" },
  { icon: Gamepad2, color: "from-green-500 to-emerald-500", titleKey: "howItWorks.typeGameTitle", descKey: "howItWorks.typeGameDesc", examplesKey: "howItWorks.typeGameExamples" },
  { icon: Video, color: "from-purple-500 to-violet-500", titleKey: "howItWorks.typeVideoTitle", descKey: "howItWorks.typeVideoDesc", examplesKey: "howItWorks.typeVideoExamples" },
];

export default function HowItWorks() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = "How BrightBoard Works | AI Content Creation for Teachers";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Learn how BrightBoard helps teachers create educational images, presentations, worksheets, games, and video storyboards in four simple steps.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-5xl mx-auto px-4 py-8 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("howItWorks.backHome")}
          </Button>
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-teal-500 bg-clip-text text-transparent" data-testid="text-how-it-works-title">
            {t("howItWorks.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-12">{t("howItWorks.stepsTitle")}</h2>
          <div className="space-y-8">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="flex gap-6 items-start" data-testid={`how-step-${index}`}>
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    {index < steps.length - 1 && (
                      <div className="w-0.5 h-12 bg-gradient-to-b from-primary/50 to-transparent mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-primary">{t("howItWorks.stepLabel")} {index + 1}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{t(step.titleKey)}</h3>
                    <p className="text-muted-foreground mb-3">{t(step.descKey)}</p>
                    <ul className="space-y-2">
                      {step.detailKeys.map((key, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{t(key)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">{t("howItWorks.contentTypesTitle")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t("howItWorks.contentTypesSubtitle")}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contentTypes.map((type, index) => {
              const IconComponent = type.icon;
              return (
                <Card key={index} className="overflow-hidden" data-testid={`content-type-${index}`}>
                  <div className={`h-3 bg-gradient-to-r ${type.color}`} />
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-lg">{t(type.titleKey)}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">{t(type.descKey)}</p>
                    <p className="text-xs text-muted-foreground/80 italic">{t(type.examplesKey)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">{t("howItWorks.whyTitle")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 text-center">
              <Clock className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t("howItWorks.why1Title")}</h3>
              <p className="text-sm text-muted-foreground">{t("howItWorks.why1Desc")}</p>
            </Card>
            <Card className="p-6 text-center">
              <Zap className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t("howItWorks.why2Title")}</h3>
              <p className="text-sm text-muted-foreground">{t("howItWorks.why2Desc")}</p>
            </Card>
            <Card className="p-6 text-center">
              <Globe className="w-8 h-8 text-teal-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t("howItWorks.why3Title")}</h3>
              <p className="text-sm text-muted-foreground">{t("howItWorks.why3Desc")}</p>
            </Card>
            <Card className="p-6 text-center">
              <Shield className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t("howItWorks.why4Title")}</h3>
              <p className="text-sm text-muted-foreground">{t("howItWorks.why4Desc")}</p>
            </Card>
          </div>
        </section>

        <section className="mb-20">
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <div className="max-w-2xl mx-auto text-center">
              <GraduationCap className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-3">{t("howItWorks.freeTitle")}</h2>
              <p className="text-muted-foreground mb-4">{t("howItWorks.freeDesc")}</p>
              <ul className="space-y-2 text-sm text-left max-w-md mx-auto mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{t("howItWorks.free1")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{t("howItWorks.free2")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{t("howItWorks.free3")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{t("howItWorks.free4")}</span>
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild data-testid="button-how-signup">
                  <Link href="/signup">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t("common.getStarted")}
                  </Link>
                </Button>
                <Button variant="outline" asChild data-testid="button-how-pricing">
                  <Link href="/pricing">{t("common.pricing")}</Link>
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </div>
      <Footer />
    </div>
  );
}
