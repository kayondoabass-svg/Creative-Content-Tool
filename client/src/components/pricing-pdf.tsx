import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";

export function PricingPDFDownload() {
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginBottom = 25;

    let yPos = 25;

    const checkPageBreak = (needed: number) => {
      if (yPos + needed > pageHeight - marginBottom) {
        doc.addPage();
        yPos = 20;
      }
    };

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("BrightBoard", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("AI Content Creation Platform for Teachers", pageWidth / 2, yPos, { align: "center" });
    yPos += 18;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Pricing Sheet", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Operated by Keyo Technologies", pageWidth / 2, yPos, { align: "center" });
    yPos += 6;
    doc.text("Website: www.brightboardapp.com", pageWidth / 2, yPos, { align: "center" });
    yPos += 18;

    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Free Tier", 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const freeFeatures = [
      "2 AI images, 1 presentation, 1 storyboard per day",
      "2 mind maps, 2 worksheets, 3 text contents per day",
      "Basic image quality",
      "All content types available",
      "Watermark on exports"
    ];
    freeFeatures.forEach(feature => {
      checkPageBreak(7);
      doc.text("• " + feature, 25, yPos);
      yPos += 6;
    });

    yPos += 10;
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Premium Plans", 20, yPos);
    yPos += 10;

    const plans = [
      {
        name: "Weekly Plan",
        price: "$4.99/week",
        originalPrice: "$7.99/week",
        savings: "Save 38%",
        features: [
          "Unlimited content generations",
          "HD/4K image quality",
          "Premium slide transitions",
          "Tap-to-reveal animations",
          "No watermarks",
          "Priority support"
        ]
      },
      {
        name: "Monthly Plan",
        price: "$15.00/month",
        originalPrice: "$19.99/month",
        savings: "Save 25%",
        features: [
          "Unlimited content generations",
          "HD/4K image quality",
          "Premium slide transitions",
          "Tap-to-reveal animations",
          "No watermarks",
          "Priority support"
        ]
      },
      {
        name: "Institution Plan",
        price: "$100.00/month",
        originalPrice: "$150.00/month",
        savings: "Save 33% — For Schools & Businesses",
        features: [
          "Everything in Monthly",
          "Up to 10 teacher accounts",
          "School branding on all content",
          "Admin dashboard & usage overview",
          "Bulk content generation",
          "Dedicated account support",
          "Early access to new features"
        ]
      }
    ];

    plans.forEach(plan => {
      checkPageBreak(15 + plan.features.length * 6);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(plan.name + " — " + plan.price, 25, yPos);
      yPos += 5;

      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text("Was " + plan.originalPrice + " · " + plan.savings, 25, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      plan.features.forEach(feature => {
        checkPageBreak(6);
        doc.text("• " + feature, 30, yPos);
        yPos += 5;
      });
      yPos += 8;
    });

    yPos += 5;
    checkPageBreak(60);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Content Types Available", 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const contentTypes = [
      "AI-Generated Images — Educational illustrations for any topic",
      "Presentations — Complete slide decks with images and speaker notes",
      "Interactive Games — 12 game types (Quiz, Memory Match, Spinner, etc.)",
      "Worksheets — Printable worksheets with questions and answer keys",
      "Video Storyboards — Animated video planning with frames",
      "Mind Maps — Visual concept mapping for any subject",
      "Text Content — Stories, explanations, and learning materials"
    ];
    contentTypes.forEach(type => {
      checkPageBreak(7);
      doc.text("• " + type, 25, yPos);
      yPos += 6;
    });

    yPos += 10;
    checkPageBreak(20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Launch Offer — Limited time discounts on all plans. Prices may change after the promotional period.", 20, yPos, {
      maxWidth: pageWidth - 40
    });

    const footerY = pageHeight - 12;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Contact: support@brightboardapp.com", 20, footerY);
    doc.text("Date: " + new Date().toLocaleDateString(), pageWidth - 50, footerY);

    doc.save("BrightBoard-Pricing-Sheet.pdf");
  };

  return (
    <Button variant="outline" size="sm" onClick={generatePDF} data-testid="button-download-pricing-pdf">
      <FileDown className="h-4 w-4 mr-2" />
      Download Pricing PDF
    </Button>
  );
}
