import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { EDITOR_WORKSPACE, rememberEditorEntry } from "@/lib/editor-entry";
import Editor from "../../../packages/brightboard-media/src/Editor";
export default function MediaStudioPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      rememberEditorEntry();
      setLocation(`/login?redirect=${encodeURIComponent(EDITOR_WORKSPACE)}`, { replace: true });
    }
  }, [isLoading, isAuthenticated, setLocation]);
  useEffect(() => { document.title = "BrightBoard Editor — Free Local Image, Video & Audio | BrightBoard"; }, []);
  if (isLoading || !isAuthenticated) return <p className="p-8 text-center" role="status">Opening BrightBoard sign-in…</p>;
  return <Editor hosted />;
}
