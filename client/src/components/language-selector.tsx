import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { languages, changeLanguage, getCurrentLanguage } from "@/i18n";

export function LanguageSelector() {
  const { t } = useTranslation();
  const [showWelcome, setShowWelcome] = useState(false);
  const currentLang = getCurrentLanguage();

  useEffect(() => {
    const hasSelectedLanguage = localStorage.getItem('brightboard-language');
    if (!hasSelectedLanguage) {
      setShowWelcome(true);
    }
  }, []);

  const handleLanguageChange = (langCode: string) => {
    changeLanguage(langCode);
    setShowWelcome(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid="button-language-selector">
            <Globe className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
            {t('language.selectLanguage')}
          </div>
          <DropdownMenuSeparator />
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="flex items-center justify-between cursor-pointer"
              data-testid={`menu-item-lang-${lang.code}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase bg-muted px-1.5 py-0.5 rounded">{lang.countryCode}</span>
                <div className="flex flex-col">
                  <span>{lang.nativeName}</span>
                  <span className="text-xs text-muted-foreground">{lang.name}</span>
                </div>
              </div>
              {currentLang === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('language.selectLanguage')}
            </DialogTitle>
            <DialogDescription>
              {t('language.choosePreferred')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto py-4">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant={currentLang === lang.code ? "default" : "outline"}
                className="justify-start gap-2 h-auto py-3"
                onClick={() => handleLanguageChange(lang.code)}
                data-testid={`button-welcome-lang-${lang.code}`}
              >
                <span className="text-xs font-mono uppercase bg-muted/50 px-1.5 py-0.5 rounded">{lang.countryCode}</span>
                <div className="flex flex-col items-start">
                  <span className="text-sm">{lang.nativeName}</span>
                  <span className="text-xs text-muted-foreground">{lang.name}</span>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
