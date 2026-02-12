import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, Globe, Heart, Target, Users, Lightbulb, Award } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { useTranslation } from "react-i18next";

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-4xl mx-auto px-4 py-8 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("about.backHome")}
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <img
                src="/favicon.png"
                alt="BrightBoard"
                className="w-12 h-12 rounded-lg object-cover"
                data-testid="img-about-logo"
              />
              <div>
                <CardTitle className="text-3xl" data-testid="text-about-title">{t("about.title")}</CardTitle>
                <p className="text-muted-foreground">{t("about.subtitle")}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="text-xl font-semibold m-0">{t("about.missionTitle")}</h2>
              </div>
              <p className="text-muted-foreground">{t("about.missionText")}</p>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="text-xl font-semibold m-0">{t("about.storyTitle")}</h2>
              </div>
              <p className="text-muted-foreground">{t("about.storyText1")}</p>
              <p className="text-muted-foreground">{t("about.storyText2")}</p>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="text-xl font-semibold m-0">{t("about.founderTitle")}</h2>
              </div>
              <div className="bg-muted/50 rounded-md p-6">
                <h3 className="text-lg font-medium mb-1">Kayondo Abass</h3>
                <p className="text-sm text-muted-foreground mb-3">{t("about.founderRole")}</p>
                <p className="text-muted-foreground">{t("about.founderBio")}</p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="text-xl font-semibold m-0">{t("about.whatWeOfferTitle")}</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-md p-4">
                  <h3 className="font-medium mb-2">{t("about.offerImages")}</h3>
                  <p className="text-sm text-muted-foreground">{t("about.offerImagesDesc")}</p>
                </div>
                <div className="bg-muted/50 rounded-md p-4">
                  <h3 className="font-medium mb-2">{t("about.offerPresentations")}</h3>
                  <p className="text-sm text-muted-foreground">{t("about.offerPresentationsDesc")}</p>
                </div>
                <div className="bg-muted/50 rounded-md p-4">
                  <h3 className="font-medium mb-2">{t("about.offerGames")}</h3>
                  <p className="text-sm text-muted-foreground">{t("about.offerGamesDesc")}</p>
                </div>
                <div className="bg-muted/50 rounded-md p-4">
                  <h3 className="font-medium mb-2">{t("about.offerWorksheets")}</h3>
                  <p className="text-sm text-muted-foreground">{t("about.offerWorksheetsDesc")}</p>
                </div>
                <div className="bg-muted/50 rounded-md p-4">
                  <h3 className="font-medium mb-2">{t("about.offerVideos")}</h3>
                  <p className="text-sm text-muted-foreground">{t("about.offerVideosDesc")}</p>
                </div>
                <div className="bg-muted/50 rounded-md p-4">
                  <h3 className="font-medium mb-2">{t("about.offerText")}</h3>
                  <p className="text-sm text-muted-foreground">{t("about.offerTextDesc")}</p>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="text-xl font-semibold m-0">{t("about.globalTitle")}</h2>
              </div>
              <p className="text-muted-foreground">{t("about.globalText")}</p>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="text-xl font-semibold m-0">{t("about.valuesTitle")}</h2>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{t("about.value1Title")}</span>
                    <p className="text-sm text-muted-foreground">{t("about.value1Desc")}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{t("about.value2Title")}</span>
                    <p className="text-sm text-muted-foreground">{t("about.value2Desc")}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{t("about.value3Title")}</span>
                    <p className="text-sm text-muted-foreground">{t("about.value3Desc")}</p>
                  </div>
                </li>
              </ul>
            </section>

            <section className="bg-gradient-to-r from-purple-600/10 to-teal-500/10 rounded-md p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">{t("about.ctaTitle")}</h2>
              <p className="text-muted-foreground mb-4">{t("about.ctaText")}</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/signup">
                  <Button data-testid="button-about-signup">{t("common.getStarted")}</Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" data-testid="button-about-contact">{t("about.contactUs")}</Button>
                </Link>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
