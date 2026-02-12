import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, Users, TrendingUp, Gift, Send, CheckCircle, Clock, Copy, Link2, Search, XCircle } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Affiliate() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"info" | "apply" | "status">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
    socialMedia: "",
    audience: "",
    reason: "",
  });

  const [statusEmail, setStatusEmail] = useState("");
  const [statusData, setStatusData] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.reason) {
      toast({ title: t("affiliate.fillRequired"), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/affiliates/apply", formData);
      const data = await res.json();
      if (data.alreadyApproved) {
        setStatusData({ found: true, status: "approved", referralCode: data.referralCode, referralLink: `https://www.brightboardapp.com/signup?ref=${data.referralCode}` });
        setActiveTab("status");
        toast({ title: t("affiliate.alreadyApproved") });
      } else {
        setIsSubmitted(true);
        toast({ title: t("affiliate.applicationSent") });
      }
    } catch (err: any) {
      const errorMsg = err?.message || t("affiliate.applicationError");
      toast({ title: errorMsg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkStatus = async () => {
    if (!statusEmail) return;
    setStatusLoading(true);
    setStatusChecked(false);
    try {
      const res = await fetch(`/api/affiliates/status/${encodeURIComponent(statusEmail)}`);
      const data = await res.json();
      setStatusData(data);
      setStatusChecked(true);
    } catch {
      toast({ title: t("affiliate.statusError"), variant: "destructive" });
    } finally {
      setStatusLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("affiliate.copied") });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-4xl mx-auto px-4 py-8 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("affiliate.backHome")}
          </Button>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent" data-testid="text-affiliate-title">
            {t("affiliate.title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("affiliate.subtitle")}
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          <Button
            variant={activeTab === "info" ? "default" : "outline"}
            onClick={() => setActiveTab("info")}
            data-testid="button-tab-info"
          >
            {t("affiliate.tabInfo")}
          </Button>
          <Button
            variant={activeTab === "apply" ? "default" : "outline"}
            onClick={() => setActiveTab("apply")}
            data-testid="button-tab-apply"
          >
            {t("affiliate.tabApply")}
          </Button>
          <Button
            variant={activeTab === "status" ? "default" : "outline"}
            onClick={() => setActiveTab("status")}
            data-testid="button-tab-status"
          >
            {t("affiliate.tabStatus")}
          </Button>
        </div>

        {activeTab === "info" && (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t("affiliate.earnTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("affiliate.earnDesc")}</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t("affiliate.recurringTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("affiliate.recurringDesc")}</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t("affiliate.payoutsTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("affiliate.payoutsDesc")}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t("affiliate.howItWorks")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { step: "1", title: t("affiliate.step1Title"), desc: t("affiliate.step1Desc") },
                  { step: "2", title: t("affiliate.step2Title"), desc: t("affiliate.step2Desc") },
                  { step: "3", title: t("affiliate.step3Title"), desc: t("affiliate.step3Desc") },
                  { step: "4", title: t("affiliate.step4Title"), desc: t("affiliate.step4Desc") },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-primary">{item.step}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t("affiliate.detailsTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">{t("affiliate.commissionTitle")}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>{t("affiliate.commWeekly")}</li>
                      <li>{t("affiliate.commMonthly")}</li>
                      <li>{t("affiliate.commYearly")}</li>
                      <li>{t("affiliate.cookieDuration")}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">{t("affiliate.paymentTitle")}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>{t("affiliate.paymentDate")}</li>
                      <li>{t("affiliate.paymentMin")}</li>
                      <li>{t("affiliate.paymentMethods")}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t("affiliate.whoCanJoin")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid md:grid-cols-2 gap-2 text-muted-foreground">
                  {["teachers", "bloggers", "influencers", "youtubers", "curriculum", "consultants"].map((type) => (
                    <li key={type} className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      {t(`affiliate.who_${type}`)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-teal-500/10 border-primary/20">
              <CardContent className="pt-6 text-center">
                <h3 className="text-2xl font-bold mb-4">{t("affiliate.readyTitle")}</h3>
                <p className="text-muted-foreground mb-6 max-w-lg mx-auto">{t("affiliate.readyDesc")}</p>
                <Button size="lg" onClick={() => setActiveTab("apply")} data-testid="button-apply-affiliate">
                  <Send className="w-4 h-4 mr-2" />
                  {t("affiliate.applyNow")}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "apply" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("affiliate.applyTitle")}</CardTitle>
              <p className="text-muted-foreground">{t("affiliate.applySubtitle")}</p>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <div className="text-center py-12" data-testid="affiliate-apply-success">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{t("affiliate.submittedTitle")}</h3>
                  <p className="text-muted-foreground mb-4">{t("affiliate.submittedText")}</p>
                  <p className="text-sm text-muted-foreground mb-6">{t("affiliate.submittedCheck")}</p>
                  <Button onClick={() => { setActiveTab("status"); setStatusEmail(formData.email); }} data-testid="button-check-status">
                    <Search className="w-4 h-4 mr-2" />
                    {t("affiliate.checkStatus")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleApply} className="space-y-5" data-testid="form-affiliate-apply">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="aff-name">{t("affiliate.formName")} *</Label>
                      <Input
                        id="aff-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t("affiliate.formNamePlaceholder")}
                        required
                        data-testid="input-affiliate-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aff-email">{t("affiliate.formEmail")} *</Label>
                      <Input
                        id="aff-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder={t("affiliate.formEmailPlaceholder")}
                        required
                        data-testid="input-affiliate-email"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="aff-website">{t("affiliate.formWebsite")}</Label>
                      <Input
                        id="aff-website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder={t("affiliate.formWebsitePlaceholder")}
                        data-testid="input-affiliate-website"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aff-social">{t("affiliate.formSocial")}</Label>
                      <Input
                        id="aff-social"
                        value={formData.socialMedia}
                        onChange={(e) => setFormData({ ...formData, socialMedia: e.target.value })}
                        placeholder={t("affiliate.formSocialPlaceholder")}
                        data-testid="input-affiliate-social"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aff-audience">{t("affiliate.formAudience")}</Label>
                    <Input
                      id="aff-audience"
                      value={formData.audience}
                      onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                      placeholder={t("affiliate.formAudiencePlaceholder")}
                      data-testid="input-affiliate-audience"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aff-reason">{t("affiliate.formReason")} *</Label>
                    <Textarea
                      id="aff-reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder={t("affiliate.formReasonPlaceholder")}
                      rows={4}
                      required
                      data-testid="input-affiliate-reason"
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting} data-testid="button-submit-affiliate">
                    {isSubmitting ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? t("affiliate.submitting") : t("affiliate.submitApplication")}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "status" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("affiliate.statusTitle")}</CardTitle>
                <p className="text-muted-foreground">{t("affiliate.statusSubtitle")}</p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input
                    type="email"
                    value={statusEmail}
                    onChange={(e) => setStatusEmail(e.target.value)}
                    placeholder={t("affiliate.statusEmailPlaceholder")}
                    onKeyDown={(e) => e.key === "Enter" && checkStatus()}
                    data-testid="input-status-email"
                  />
                  <Button onClick={checkStatus} disabled={statusLoading || !statusEmail} data-testid="button-check-affiliate-status">
                    {statusLoading ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {statusChecked && statusData && (
              <>
                {!statusData.found ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t("affiliate.notFound")}</h3>
                      <p className="text-muted-foreground mb-4">{t("affiliate.notFoundDesc")}</p>
                      <Button onClick={() => setActiveTab("apply")} data-testid="button-apply-from-status">
                        {t("affiliate.applyNow")}
                      </Button>
                    </CardContent>
                  </Card>
                ) : statusData.status === "pending" ? (
                  <Card>
                    <CardContent className="pt-6 text-center" data-testid="status-pending">
                      <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t("affiliate.pendingTitle")}</h3>
                      <Badge variant="secondary">{t("affiliate.pendingBadge")}</Badge>
                      <p className="text-muted-foreground mt-4">{t("affiliate.pendingDesc")}</p>
                      {statusData.appliedAt && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {t("affiliate.appliedOn")} {new Date(statusData.appliedAt).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : statusData.status === "approved" ? (
                  <Card>
                    <CardContent className="pt-6" data-testid="status-approved">
                      <div className="text-center mb-6">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{t("affiliate.approvedTitle")}</h3>
                        <Badge className="bg-green-500">{t("affiliate.approvedBadge")}</Badge>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-muted/50 rounded-md p-4">
                          <Label className="text-sm">{t("affiliate.yourCode")}</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-lg font-mono font-bold text-primary flex-1" data-testid="text-referral-code">{statusData.referralCode}</code>
                            <Button size="icon" variant="outline" onClick={() => copyToClipboard(statusData.referralCode)} data-testid="button-copy-code">
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="bg-muted/50 rounded-md p-4">
                          <Label className="text-sm">{t("affiliate.yourLink")}</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-sm font-mono text-primary break-all flex-1" data-testid="text-referral-link">{statusData.referralLink}</code>
                            <Button size="icon" variant="outline" onClick={() => copyToClipboard(statusData.referralLink)} data-testid="button-copy-link">
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-muted/50 rounded-md p-4 text-center">
                            <p className="text-2xl font-bold" data-testid="text-total-referrals">{statusData.totalReferrals || 0}</p>
                            <p className="text-sm text-muted-foreground">{t("affiliate.totalReferrals")}</p>
                          </div>
                          <div className="bg-muted/50 rounded-md p-4 text-center">
                            <p className="text-2xl font-bold" data-testid="text-total-earnings">${((statusData.totalEarnings || 0) / 100).toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">{t("affiliate.totalEarnings")}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center" data-testid="status-rejected">
                      <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t("affiliate.rejectedTitle")}</h3>
                      <Badge variant="destructive">{t("affiliate.rejectedBadge")}</Badge>
                      {statusData.rejectedReason && (
                        <p className="text-muted-foreground mt-4">{statusData.rejectedReason}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-4">{t("affiliate.rejectedDesc")}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
