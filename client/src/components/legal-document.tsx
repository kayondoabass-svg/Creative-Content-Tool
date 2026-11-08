import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Footer } from "@/components/footer";

export type LegalSection = { id: string; title: string; content: ReactNode };

export const legalReviewDate = "8 November 2026";
export const legalContact = "support@brightboardapp.com";
export const legalOperator = {
  name: "Keyo Technologies",
  registrationLocation: "Kampala, Uganda",
  address: "SHAMBA COMPLEX P44, William Street, Kampala, Uganda",
};

export function LegalSectionList({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-5 space-y-2">{children}</ul>;
}

export function LegalContact() {
  return <a href={`mailto:${legalContact}`} className="text-primary underline">{legalContact}</a>;
}

export function LegalDocument({ title, introduction, sections }: {
  title: string;
  introduction: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen page-shell flex flex-col">
      <main className="bb-page max-w-4xl py-10 md:py-14 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Home
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <h1 className="text-3xl font-bold" data-testid="legal-document-title">{title}</h1>
            <p className="text-muted-foreground">Last updated: {legalReviewDate}</p>
          </CardHeader>
          <CardContent className="space-y-7 text-sm leading-relaxed">
            <aside className="rounded-md border bg-muted/30 p-4" data-testid="legal-policy-notice">
              <strong>About this update.</strong> This notice describes BrightBoard’s current services
              and preserves mandatory local rights. It applies when published; material contractual
              changes for existing customers remain subject to any required notice and acceptance.
              This is not legal advice or a certification of EU or worldwide compliance.
              Updating these documents does not implement consent controls, AI labelling, or other
              compliance systems. Requirements that still need implementation are identified below.
            </aside>
            <div className="text-muted-foreground space-y-3">{introduction}</div>
            <nav aria-label={`${title} contents`} className="rounded-lg border p-4">
              <h2 className="font-semibold mb-3">Contents</h2>
              <ol className="list-decimal pl-5 space-y-2">
                {sections.map(section => <li key={section.id}><a className="text-primary underline" href={`#${section.id}`}>{section.title}</a></li>)}
              </ol>
            </nav>
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-xl font-semibold mb-3">{index + 1}. {section.title}</h2>
                <div className="text-muted-foreground space-y-3">{section.content}</div>
              </section>
            ))}
            <nav aria-label="Related legal documents" className="border-t pt-5 flex flex-wrap gap-5">
              <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>
              <Link href="/terms" className="text-primary underline">Terms and Conditions</Link>
              <Link href="/refund" className="text-primary underline">Refund information</Link>
              <LegalContact />
            </nav>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
