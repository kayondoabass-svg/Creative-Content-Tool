import { useTranslation } from "react-i18next";
import en from "@/i18n/locales/en.json";

// A new key space lets languages fall back to audited copy rather than older
// translations containing retired pricing, timing or safety guarantees.
const updates: Record<string, string> = {
  "howItWorks.subtitle": "Choose AI-assisted teaching materials, professional school documents, interactive presentations or browser-local media creation. Each tool has its own workflow.",
  "howItWorks.stepsTitle": "From an idea to a reusable teaching resource",
  "howItWorks.step1Title": "Choose the right tool",
  "howItWorks.step1Desc": "Use the teaching workspace for AI content, Teacher Studio for school documents, BrightboardTV for presenting, or BrightBoard Editor for local image, video and audio creation.",
  "howItWorks.step1Detail1": "Sign up and confirm your email for account-based services",
  "howItWorks.step1Detail2": "Open BrightBoard Editor without a paid subscription",
  "howItWorks.step1Detail3": "Use the Editor’s downloadable offline edition without an account",
  "howItWorks.step2Title": "Describe, design or import",
  "howItWorks.step2Desc": "For AI tools, describe the topic and choose your subject, grade and available options. In Editor, choose a procedural scene and edit layers. In BrightboardTV, create pages or import supported files.",
  "howItWorks.step2Detail1": "Use text or supported browser voice input for AI prompts",
  "howItWorks.step2Detail2": "Adjust Editor text, shapes, colours, seed and animation",
  "howItWorks.step2Detail3": "Import .pptx, PDF, images or lesson backups into BrightboardTV",
  "howItWorks.step3Title": "Preview, check and refine",
  "howItWorks.step3Desc": "Review AI-generated facts, language and answer keys before classroom use. Preview local animation and synthesized audio, or rehearse your presentation before showing it to an audience.",
  "howItWorks.step3Detail1": "AI generation times depend on the provider, request and queue",
  "howItWorks.step3Detail2": "Editor generates procedural graphics and sound, not photorealistic AI or speech",
  "howItWorks.step3Detail3": "Video recording happens in real time; keep the Editor tab visible",
  "howItWorks.step4Title": "Export, present and keep a backup",
  "howItWorks.step4Desc": "Use the export options offered by each tool. Download account-generated creations before their 24-hour history expires. Save editable project and lesson backups separately from finished media.",
  "howItWorks.step4Detail1": "Export teaching resources in the formats offered for that content",
  "howItWorks.step4Detail2": "Present with BrightboardTV and pair an approved QR controller",
  "howItWorks.step4Detail3": "Save Editor projects and .bbtv lessons to keep editable copies",
  "howItWorks.contentTypesTitle": "AI-assisted classroom resources",
  "howItWorks.contentTypesSubtitle": "These tools use online generation services. They are separate from the local, free BrightBoard Editor described above.",
  "howItWorks.typeGameDesc": "Create browser-playable activities such as quizzes, memory games and spinners using the available game templates.",
  "howItWorks.typeMindmapTitle": "Visual mind maps",
  "howItWorks.typeMindmapDesc": "Organise a topic into connected ideas. Choose the available layout, branch and illustration options, then review the connections before sharing.",
  "howItWorks.typeMindmapExamples": "Examples: Topic overviews, brainstorming, revision and concept connections",
  "howItWorks.typeVideoDesc": "Plan visual sequences with scene descriptions and timing. Use the storyboard tool’s available narration, music, subtitle and video export options; review the result before sharing.",
  "howItWorks.why1Title": "Reduce preparation work",
  "howItWorks.why1Desc": "Start from generated drafts and reusable projects, then adapt the result to your learners.",
  "howItWorks.why2Title": "Review before teaching",
  "howItWorks.why2Desc": "Check facts, answers, accessibility and suitability. AI-generated content can contain errors.",
  "howItWorks.why3Title": "Language choices",
  "howItWorks.why3Desc": "Choose from the supported interface and generation languages. Voice input depends on browser permissions and support.",
  "howItWorks.why4Title": "Know where work is saved",
  "howItWorks.why4Desc": "Account creation history lasts 24 hours. Editor drafts are browser-local; downloaded backups are separate copies.",
  "howItWorks.freeTitle": "Understand free access and plan limits",
  "howItWorks.freeDesc": "BrightBoard Editor, its offline downloads and developer API are free for now. Existing AI tools and hosted presentation services retain their own plan limits.",
  "howItWorks.free1": "Editor: local creation without a paid plan or generation API key",
  "howItWorks.free2": "AI teaching tools: check the current per-tool allowance in your account",
  "howItWorks.free3": "Hosted BrightboardTV: 20 free / 50 standard / 100 business pages",
  "howItWorks.free4": "Developer API: free account-owned keys with technical safety limits",
  "features.subtitle": "Explore AI teaching resources, Teacher Studio, open-source BrightboardTV and the free BrightBoard Editor. Choose online assistance or local creation to suit your work.",
  "features.imageDetail": "Choose the available style, subject and grade options. AI generation depends on online providers and your account allowance. Check the image and export dimensions before printing; generated labels and diagrams may need correction.",
  "features.imageBenefit1": "Custom illustrations from a classroom prompt",
  "features.imageBenefit2": "Grade and subject guidance for generation",
  "features.imageBenefit4": "Available quality options depend on your account and tool",
  "features.presentationBenefit2": "Slide count options subject to your account limits",
  "features.presentationDesc": "Draft a lesson deck from a description, with structured slides, key points, speaker notes and relevant imagery. Review the slides before teaching.",
  "features.presentationDetail": "Choose the slide count and supported presentation settings offered by your plan. Use available reference inputs to guide the result, export to PowerPoint, or present with the available slideshow controls. Fonts, transitions and media can behave differently in other presentation software.",
  "features.textDetail": "Use the grade, topic and style controls to guide vocabulary and depth. Treat the output as a draft: verify facts and reading level, then copy or export using the available controls.",
  "features.textBenefit2": "Draft content for your chosen topic or subject",
  "features.worksheetDetail": "Generate practice material and answer keys using the available worksheet options. Review questions, layout and answers before printing or sharing. Use the export formats offered for the generated worksheet.",
  "features.worksheetBenefit1": "Question styles guided by your request",
  "features.worksheetBenefit2": "Generated answer keys for teacher review",
  "features.gameDesc": "Build browser-playable learning activities using the available game templates, including quizzes, memory games and spinners.",
  "features.gameDetail": "Select a game format and provide the content you want learners to practise. Preview the activity before class. Interaction, sound and animation vary by template and browser; test on the device your learners will use.",
  "features.gameBenefit1": "Game templates such as Spinner, Memory Match and Quiz Show",
  "features.gameBenefit4": "Browser-based play on supported devices",
  "features.videoTitle": "Online video storyboards",
  "features.videoDesc": "Create scene-based educational storyboards, then use the tool’s available narration, music, subtitle and video export options.",
  "features.videoDetail": "The storyboard tool creates scene-based educational plans and offers narration, music, subtitles and recording options where available. This online workflow is separate from BrightBoard Editor, which records procedural scenes with locally synthesized audio. Neither is a promise of general text-to-video filmmaking.",
  "features.platformSafeTitle": "Teacher review matters",
  "features.platformSafeDesc": "Grade and subject controls guide AI generation, but do not guarantee accuracy or suitability. Review facts, answer keys and visuals before classroom use.",
  "features.platformFastTitle": "Preview and progress",
  "features.platformFastDesc": "Online generation depends on providers and the queue. Local Editor performance depends on your device; video recording takes approximately the selected duration.",
  "features.platformVoiceDesc": "Use voice input where your browser supports it and microphone permission is granted. You can always type your prompt instead.",
  "features.platformExportDesc": "Export formats depend on the tool: teaching documents and slides, Editor PNG/JPEG/SVG/WAV and supported browser video, plus editable project or lesson backups.",
  "features.ctaText": "Prepare teaching materials, work in Teacher Studio, present with BrightboardTV, or create images, animation and sound locally with BrightBoard Editor.",
};

export function useProductPageCopy() {
  const { t } = useTranslation();
  return { t: (key: string, options?: { defaultValue?: string }) => {
    const [section, field] = key.split(".");
    if (section !== "features" && section !== "howItWorks") return t(key, options);
    const original = (en[section] as Record<string, string>)[field];
    return t(`currentProduct.${key}`, {
      defaultValue: updates[key] ?? options?.defaultValue ?? original ?? key,
    });
  } };
}
