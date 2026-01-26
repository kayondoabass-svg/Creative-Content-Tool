import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Mail, Sparkles } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-card/50" data-testid="footer">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-400 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
                BrightBoard
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('footer.product')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-pricing">
                  {t('common.pricing')}
                </Link>
              </li>
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">
                  {t('common.features')}
                </Link>
              </li>
              <li>
                <Link href="/file-tools" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-file-tools">
                  {t('common.fileTools')}
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-get-started">
                  {t('common.getStarted')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-terms">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-privacy">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-refund">
                  {t('footer.refund')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('footer.earn')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/affiliate" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-affiliate">
                  {t('footer.affiliate')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="mailto:support@brightboardapp.com" 
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  data-testid="link-email"
                >
                  <Mail className="w-4 h-4" />
                  support@brightboardapp.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} BrightBoard. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with love for educators worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}
