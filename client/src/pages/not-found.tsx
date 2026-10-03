import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="page-shell min-h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 p-2">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3 items-center">
            <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0"><AlertCircle className="h-5 w-5" /></div>
            <h1 className="bb-display text-2xl font-extrabold">This page took a wrong turn</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">The address may be outdated, or the page may have moved.</p>
          <Link href="/" className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to BrightBoard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
