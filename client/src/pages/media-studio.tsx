import { useEffect } from "react";
import Editor from "../../../packages/brightboard-media/src/Editor";
export default function MediaStudioPage() {
  useEffect(() => { document.title = "Media Studio — Free Local Image, Video & Audio | BrightBoard"; }, []);
  return <Editor hosted />;
}
