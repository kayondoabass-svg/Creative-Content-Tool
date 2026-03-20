import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, MapPin, Clock, Send, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Contact() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "general",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast({ title: t("contact.fillRequired"), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/contact", formData);
      setIsSubmitted(true);
      toast({ title: t("contact.successTitle"), description: t("contact.successDesc") });
    } catch {
      toast({ title: t("contact.errorTitle"), description: t("contact.errorDesc"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-4xl mx-auto px-4 py-8 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("contact.backHome")}
          </Button>
        </Link>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <h1 className="text-3xl font-bold" data-testid="text-contact-title">{t("contact.title")}</h1>
                <p className="text-muted-foreground">{t("contact.subtitle")}</p>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-12" data-testid="contact-success">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t("contact.thankYouTitle")}</h3>
                    <p className="text-muted-foreground mb-6">{t("contact.thankYouText")}</p>
                    <Button onClick={() => { setIsSubmitted(false); setFormData({ name: "", email: "", subject: "general", message: "" }); }} data-testid="button-send-another">
                      {t("contact.sendAnother")}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-contact">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("contact.nameLabel")} *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t("contact.namePlaceholder")}
                          required
                          data-testid="input-contact-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("contact.emailLabel")} *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder={t("contact.emailPlaceholder")}
                          required
                          data-testid="input-contact-email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">{t("contact.subjectLabel")}</Label>
                      <Select value={formData.subject} onValueChange={(val) => setFormData({ ...formData, subject: val })}>
                        <SelectTrigger data-testid="select-contact-subject">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">{t("contact.subjectGeneral")}</SelectItem>
                          <SelectItem value="support">{t("contact.subjectSupport")}</SelectItem>
                          <SelectItem value="billing">{t("contact.subjectBilling")}</SelectItem>
                          <SelectItem value="feedback">{t("contact.subjectFeedback")}</SelectItem>
                          <SelectItem value="partnership">{t("contact.subjectPartnership")}</SelectItem>
                          <SelectItem value="bug">{t("contact.subjectBug")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">{t("contact.messageLabel")} *</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder={t("contact.messagePlaceholder")}
                        rows={6}
                        required
                        data-testid="input-contact-message"
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto" data-testid="button-contact-submit">
                      {isSubmitting ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {isSubmitting ? t("contact.sending") : t("contact.sendMessage")}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">{t("contact.emailTitle")}</h3>
                    <a href="mailto:support@brightboardapp.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-contact-email">
                      support@brightboardapp.com
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">{t("contact.locationTitle")}</h3>
                    <p className="text-sm text-muted-foreground" data-testid="text-contact-location">{t("contact.locationText")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-1">{t("contact.responseTitle")}</h3>
                    <p className="text-sm text-muted-foreground" data-testid="text-contact-response">{t("contact.responseText")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
