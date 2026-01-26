import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";

export function PricingPDFDownload() {
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("BrightBoard", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("AI Content Creation Platform for Teachers", pageWidth / 2, 33, { align: "center" });
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Pricing Sheet", pageWidth / 2, 50, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Operated by Kayondo Abass (Sole Proprietor)", pageWidth / 2, 58, { align: "center" });
    doc.text("Website: www.brightboardapp.com", pageWidth / 2, 64, { align: "center" });
    
    let yPos = 80;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Free Tier", 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const freeFeatures = [
      "5 content generations per day",
      "Basic 2D/3D image quality",
      "Standard slide transitions",
      "All content types available",
      "Watermark on exports"
    ];
    freeFeatures.forEach(feature => {
      doc.text("• " + feature, 25, yPos);
      yPos += 6;
    });
    
    yPos += 10;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Premium Plans", 20, yPos);
    yPos += 10;
    
    const plans = [
      {
        name: "Weekly Plan",
        price: "$4.99/week",
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
        name: "Monthly Plan (Save 25%)",
        price: "$14.99/month",
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
        name: "Yearly Plan (Best Value - Save 60%)",
        price: "$99.99/year",
        features: [
          "Unlimited content generations",
          "HD/4K image quality",
          "Premium slide transitions",
          "Tap-to-reveal animations",
          "No watermarks",
          "Priority support",
          "2 months free"
        ]
      }
    ];
    
    plans.forEach(plan => {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(plan.name + " - " + plan.price, 25, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      plan.features.forEach(feature => {
        doc.text("• " + feature, 30, yPos);
        yPos += 5;
      });
      yPos += 8;
    });
    
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Content Types Available", 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const contentTypes = [
      "AI-Generated Images - Educational illustrations for any topic",
      "Presentations - Complete slide decks with images and speaker notes",
      "Interactive Games - 12 game types (Quiz, Memory Match, Spinner, etc.)",
      "Worksheets - Printable worksheets with questions and answer keys",
      "Video Storyboards - Animated video planning with frames",
      "Text Content - Stories, explanations, and learning materials"
    ];
    contentTypes.forEach(type => {
      doc.text("• " + type, 25, yPos);
      yPos += 6;
    });
    
    yPos = 270;
    doc.setFontSize(8);
    doc.text("Contact: support@brightboardapp.com", 20, yPos);
    doc.text("Date: " + new Date().toLocaleDateString(), pageWidth - 50, yPos);
    
    doc.save("BrightBoard-Pricing-Sheet.pdf");
  };

  return (
    <Button variant="outline" size="sm" onClick={generatePDF} data-testid="button-download-pricing-pdf">
      <FileDown className="h-4 w-4 mr-2" />
      Download Pricing PDF
    </Button>
  );
}
