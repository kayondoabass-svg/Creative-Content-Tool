import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Image, Presentation, FileText, Video, FileSpreadsheet, Gamepad2, Sparkles, CheckCircle2, GraduationCap, Globe, Zap, Shield, Clock, Download, Palette, Brain, Volume2, Languages, FileCheck, Layers, Star } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

const featureSections = [
  {
    icon: Image,
    color: "from-pink-500 to-rose-500",
    titleKey: "features.imageTitle",
    descKey: "features.imageDesc",
    detailKey: "features.imageDetail",
    benefitsKeys: ["features.imageBenefit1", "features.imageBenefit2", "features.imageBenefit3", "features.imageBenefit4"],
    useCaseKey: "features.imageUseCase",
  },
  {
    icon: Presentation,
    color: "from-blue-500 to-cyan-500",
    titleKey: "features.presentationTitle",
    descKey: "features.presentationDesc",
    detailKey: "features.presentationDetail",
    benefitsKeys: ["features.presentationBenefit1", "features.presentationBenefit2", "features.presentationBenefit3", "features.presentationBenefit4"],
    useCaseKey: "features.presentationUseCase",
  },
  {
    icon: FileText,
    color: "from-teal-500 to-cyan-500",
    titleKey: "features.textTitle",
    descKey: "features.textDesc",
    detailKey: "features.textDetail",
    benefitsKeys: ["features.textBenefit1", "features.textBenefit2", "features.textBenefit3", "features.textBenefit4"],
    useCaseKey: "features.textUseCase",
  },
  {
    icon: FileSpreadsheet,
    color: "from-orange-500 to-amber-500",
    titleKey: "features.worksheetTitle",
    descKey: "features.worksheetDesc",
    detailKey: "features.worksheetDetail",
    benefitsKeys: ["features.worksheetBenefit1", "features.worksheetBenefit2", "features.worksheetBenefit3", "features.worksheetBenefit4"],
    useCaseKey: "features.worksheetUseCase",
  },
  {
    icon: Gamepad2,
    color: "from-green-500 to-emerald-500",
    titleKey: "features.gameTitle",
    descKey: "features.gameDesc",
    detailKey: "features.gameDetail",
    benefitsKeys: ["features.gameBenefit1", "features.gameBenefit2", "features.gameBenefit3", "features.gameBenefit4"],
    useCaseKey: "features.gameUseCase",
  },
  {
    icon: Video,
    color: "from-purple-500 to-violet-500",
    titleKey: "features.videoTitle",
    descKey: "features.videoDesc",
    detailKey: "features.videoDetail",
    benefitsKeys: ["features.videoBenefit1", "features.videoBenefit2", "features.videoBenefit3", "features.videoBenefit4"],
    useCaseKey: "features.videoUseCase",
  },
];

const platformFeatures = [
  { icon: Globe, titleKey: "features.platformLangTitle", descKey: "features.platformLangDesc" },
  { icon: Download, titleKey: "features.platformExportTitle", descKey: "features.platformExportDesc" },
  { icon: Shield, titleKey: "features.platformSafeTitle", descKey: "features.platformSafeDesc" },
  { icon: Clock, titleKey: "features.platformFastTitle", descKey: "features.platformFastDesc" },
  { icon: Layers, titleKey: "features.platformHistoryTitle", descKey: "features.platformHistoryDesc" },
  { icon: Volume2, titleKey: "features.platformVoiceTitle", descKey: "features.platformVoiceDesc" },
];

export default function Features() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = "Features | BrightBoard - AI Content Creation for Teachers";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Explore BrightBoard's powerful features: AI image generation, slide presentations, worksheets, interactive games, video storyboards, and text content for educators.";
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
            {t("features.backHome")}
          </Button>
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-teal-500 bg-clip-text text-transparent" data-testid="text-features-title">
            {t("features.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="space-y-12 mb-20">
          {featureSections.map((feature, index) => {
            const IconComponent = feature.icon;
            const isEven = index % 2 === 0;
            return (
              <Card key={index} className="overflow-hidden" data-testid={`feature-section-${index}`}>
                <div className={`h-2 bg-gradient-to-r ${feature.color}`} />
                <CardContent className="p-6 md:p-8">
                  <div className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} gap-6`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold">{t(feature.titleKey)}</h2>
                      </div>
                      <p className="text-muted-foreground mb-4">{t(feature.descKey)}</p>
                      <p className="text-sm text-muted-foreground mb-4">{t(feature.detailKey)}</p>
                      <div className="bg-muted/50 rounded-lg p-4 text-sm">
                        <p className="font-medium mb-1 flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-500" />
                          {t("features.perfectFor")}
                        </p>
                        <p className="text-muted-foreground italic">{t(feature.useCaseKey)}</p>
                      </div>
                    </div>
                    <div className="md:w-72 flex-shrink-0">
                      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-sm">{t("features.keyBenefits")}</h4>
                        {feature.benefitsKeys.map((key, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{t(key)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">{t("features.platformTitle")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t("features.platformSubtitle")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformFeatures.map((pf, index) => {
              const IconComponent = pf.icon;
              return (
                <Card key={index} className="p-6" data-testid={`platform-feature-${index}`}>
                  <IconComponent className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">{t(pf.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground">{t(pf.descKey)}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 text-center">
            <GraduationCap className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">{t("features.ctaTitle")}</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">{t("features.ctaText")}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild data-testid="button-features-signup">
                <Link href="/signup">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t("common.getStarted")}
                </Link>
              </Button>
              <Button variant="outline" asChild data-testid="button-features-how">
                <Link href="/how-it-works">{t("features.seeHowItWorks")}</Link>
              </Button>
            </div>
          </Card>
        </section>
      </div>
      <Footer />
    </div>
  );
}
