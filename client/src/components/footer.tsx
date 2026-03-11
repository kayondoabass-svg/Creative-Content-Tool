import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { SiFacebook } from "react-icons/si";

const FACEBOOK_URL = "https://www.facebook.com/share/1Degjg2YnK/";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-card/50" data-testid="footer">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <img 
                src="/favicon.png" 
                alt="BrightBoard" 
                className="w-8 h-8 rounded-lg object-cover"
              />
              <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
                BrightBoard
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              {t('footer.description')}
            </p>
            <div className="flex items-center gap-3">
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-facebook-footer"
                className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center text-white hover:bg-[#1666d8] transition-colors shadow-sm"
                aria-label="Follow BrightBoard on Facebook"
              >
                <SiFacebook className="w-4 h-4" />
              </a>
              <a
                href="mailto:support@brightboardapp.com"
                data-testid="link-email-footer-icon"
                className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                aria-label="Email BrightBoard support"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
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
                <Link href="/features" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">
                  {t('common.features')}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">
                  {t('footer.howItWorks')}
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
            <h4 className="font-semibold mb-4">{t('footer.company')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-about">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-blog">
                  {t('footer.blog')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-contact">
                  {t('footer.contactUs')}
                </Link>
              </li>
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
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-facebook-bottom"
            className="flex items-center gap-2 text-sm text-[#1877F2] hover:text-[#1666d8] transition-colors font-medium"
          >
            <SiFacebook className="w-4 h-4" />
            Follow us on Facebook
          </a>
          <p className="text-sm text-muted-foreground">
            Made with love for educators worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}
