import { useEffect } from "react";
import { useLocation } from "wouter";

const BASE_URL = "https://brightboardapp.com";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article";
}

function setMeta(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function SEOHead({ title, description, canonicalPath, ogImage, ogType = "website" }: SEOHeadProps) {
  const [location] = useLocation();
  const path = canonicalPath ?? location;
  const canonicalUrl = `${BASE_URL}${path}`;
  const image = ogImage ?? DEFAULT_IMAGE;

  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setCanonical(canonicalUrl);

    setMeta("og:type", ogType, true);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:image", image, true);
    setMeta("og:site_name", "BrightBoard", true);

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);
  }, [title, description, canonicalUrl, image, ogType]);

  return null;
}
