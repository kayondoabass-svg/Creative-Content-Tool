import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, Code2, Github, Monitor, PenTool, Smartphone, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const repository = "https://github.com/kayondoabass-svg/Brightboard-TV";

export function BrightboardTVPublicSection({ detailed = false }: { detailed?: boolean }) {
  const { t } = useTranslation();
  const text = (key: string, defaultValue: string) => t(`tvPublic.${key}`, { defaultValue });
  const headingId = detailed ? "tv-features-heading" : "tv-about-heading";
  const highlights: [LucideIcon, string, string, string, string][] = detailed ? [
    [PenTool, "drawTitle", "Draw, import and explain", "drawText", "Use the whiteboard, explore compatible 3D models, and import PDFs, images or .bbtv lessons. Merge lesson pages without replacing your current presentation."],
    [Smartphone, "remoteTitle", "Control it from your phone or tablet", "remoteText", "Pair with a QR code, approve the controller, change pages, use a laser pointer and read private speaker notes while the audience sees the presentation."],
    [Monitor, "displayTitle", "Use ordinary screens too", "displayText", "Connect a computer to a TV or projector, including by HDMI. BrightboardTV synchronises its own presentation; native casting and whole-device screen/audio mirroring depend on your hardware."],
  ] : [
    [Monitor, "useTitle", "Start in the browser or run your own copy", "useText", "Launch through BrightBoard, or download the source or prebuilt package and follow the installation guide. A connected computer makes an ordinary TV or projector usable for presenting."],
    [Code2, "buildTitle", "Make it your own", "buildText", "Develop new teaching tools, presentation workflows or integrations. The public repository includes the independent presentation core, its relay, documentation and licence—not BrightBoard's private account, payment or founder-dashboard services."],
    [Github, "contributeTitle", "Help improve the project", "contributeText", "Explore the repository's contribution and security guidance. Share bug reports, propose improvements or contribute code through GitHub."],
  ];
  return <section className="bb-surface p-7 md:p-9 mb-10" aria-labelledby={headingId} data-testid="brightboardtv-public-section">
    <div className="grid lg:grid-cols-2 gap-8">
      <div>
        <p className="bb-eyebrow mb-3">BrightboardTV · {text("openSource", "Open source")}</p>
        <h2 id={headingId} className="bb-display text-3xl font-extrabold mb-4">
          {detailed ? text("featuresTitle", "From an idea to an interactive presentation") : text("aboutTitle", "Built for everyone with something to share")}
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">{text("audience", "BrightboardTV is our open-source presentation workspace for teachers, public speakers, CEOs, managers, trainers and anyone who wants to explain an idea clearly. Use it in a classroom, on stage or in a team meeting.")}</p>
        <p className="text-muted-foreground leading-relaxed">{text("licence", "The BrightboardTV software is released under the Apache License 2.0. You can inspect the code, use it, modify it, self-host it, redistribute it with the required notices, and build your own tools on top of it. Assets and third-party dependencies retain their own licences.")}</p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-6">
          <Button asChild><Link href="/brightboardtv" data-testid="link-tv-guide">{text("guide", "Explore, download & install")}<ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
          <Button asChild variant="outline"><a href={repository} target="_blank" rel="noopener noreferrer" data-testid="link-tv-source"><Github className="w-4 h-4 mr-2" />{text("source", "View code & contribute")}</a></Button>
        </div>
      </div>
      <div className="rounded-xl border bg-muted/25 p-5 md:p-6">
        <h3 className="text-xl font-bold mb-5">{detailed ? text("toolsTitle", "Present your way") : text("communityTitle", "Use it. Adapt it. Build on it.")}</h3>
        <ul className="space-y-5">
          {highlights.map(([Icon, titleKey, title, descKey, description]) => <li key={titleKey} className="flex gap-3">
            <Icon className="w-5 h-5 shrink-0 text-primary mt-1" aria-hidden="true" />
            <div><h4 className="font-semibold mb-1">{text(titleKey, title)}</h4><p className="text-sm text-muted-foreground leading-relaxed">{text(descKey, description)}</p></div>
          </li>)}
        </ul>
      </div>
    </div>
    <p className="text-sm text-muted-foreground border-t mt-7 pt-5">{text("plans", "The independent open-source app is free to use and does not require BrightBoard AI keys or a paid account. BrightBoard's hosted AI generation and plans are separate. Manual saving to the hosted lesson library requires a paid plan and stores lessons in that browser; export and device import remain available. New BrightBoard generations stay in private recent history for 24 hours, so download or export anything you want to keep.")}</p>
  </section>;
}
