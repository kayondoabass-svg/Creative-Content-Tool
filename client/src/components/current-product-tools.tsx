import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export function CurrentProductTools({ workflow = false }: { workflow?: boolean }) {
  const { t } = useTranslation();
  const copy = (key: string, value: string) => t(`currentProduct.tools.${key}`, { defaultValue: value });
  const tools = [
    { id: "studio", title: "Teacher Studio", href: "/studio",
      text: "Create teaching CVs, certificates, school logos and report cards. Supported document conversion is available through the file tools.",
      action: "Open Teacher Studio" },
    { id: "tv", title: "BrightboardTV", href: "/brightboardtv",
      text: "Build interactive lessons and talks, draw on pages, import .pptx, PDFs, images and .bbtv lessons, and pair approved QR controllers. Hosted page limits are 20 free / 50 standard / 100 business. Keep .bbtv backups; casting and screen mirroring depend on your hardware.",
      action: "Explore BrightboardTV" },
    { id: "editor", title: "BrightBoard Editor", href: "/editor",
      text: "Free procedural image, animated video and synthesized audio creation. Edit text and shape layers, preview motion, save projects, and export PNG, JPEG, SVG, WAV and supported WebM/MP4 video. Includes five 2D scenes, a 3D sculpture, Undo/Redo and a built-in How to use guide.",
      action: "Open BrightBoard Editor" },
    { id: "developers", title: "Developer tools", href: "/developers",
      text: "Use the free local JavaScript SDK without an account, or create account-owned keys for the free hosted image, audio and video API. Hosted safety limits apply; server video needs FFmpeg. MCP is coming soon, not an available endpoint.",
      action: "View API setup & downloads" },
  ];
  return <section className="mb-12" aria-labelledby="current-tools-title" data-testid="current-product-tools">
    <h2 id="current-tools-title" className="bb-display text-2xl font-bold mb-3">{copy("title", workflow ? "Start with the tool that fits your task" : "One BrightBoard website, distinct tools")}</h2>
    <p className="text-muted-foreground mb-6">{copy("intro", "Teacher Studio, BrightboardTV and BrightBoard Editor serve different purposes. The downloadable open-source tools do not include BrightBoard’s private account or payment services.")}</p>
    <div className="grid md:grid-cols-2 gap-5">{tools.map(tool => <Card key={tool.id} className="p-6 flex flex-col" data-testid={`current-tool-${tool.id}`}>
      <h3 className="text-xl font-bold mb-3">{tool.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{copy(`${tool.id}Text`, tool.text)}</p>
      <Link href={tool.href} className="text-sm font-semibold text-primary underline underline-offset-4">{copy(`${tool.id}Action`, tool.action)}</Link>
    </Card>)}</div>
    <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm text-muted-foreground leading-relaxed">
      <strong className="text-foreground">{copy("offlineTitle", "What works offline?")} </strong>
      {copy("offlineText", "The extracted BrightBoard Editor offline edition creates and exports locally with included assets—no CDN, account or external generation API. Its project draft stays in that browser, so download a backup. 4K and 8K still exports depend on device resources; video records in real time with browser-dependent codecs and no 8K video. AI teaching generation and hosted developer API requests require internet access.")}
    </div>
  </section>;
}
