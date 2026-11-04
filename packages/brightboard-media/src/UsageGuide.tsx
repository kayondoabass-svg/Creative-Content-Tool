import React from "react";

export default function UsageGuide() {
  return <details className="bm-guide" id="editor-guide">
    <summary>How to use BrightBoard Editor <span>Open the step-by-step guide</span></summary>
    <div className="bm-guide-body">
      <p className="bm-guide-intro">Start with a scene, add your own text and shapes, then export an image, animation or synthesized sound. Everything in this editor is generated on your device. It creates procedural graphics and sounds—not photorealistic AI images or spoken voices.</p>
      <ol className="bm-guide-steps">
        <li><h2>Choose a scene and size</h2><p>Give your project a title at the top. Under <strong>Scene & composition</strong>, choose Flow field, Swaying tree, Wave terrain, Geometric pattern, Geometric mark or 3D sculpture. Use Landscape, Portrait or Square, or enter Width and Height. Press Enter or leave a number field to apply it.</p></li>
        <li><h2>Make the design yours</h2><p>Change Background, Primary and Accent colours. Adjust Density and Seed; the same scene and seed reproduce the same pattern. <strong>Randomize</strong> chooses a new seed. In 3D sculpture, use the camera control to change the viewing angle.</p></li>
        <li><h2>Add and arrange layers</h2><p>Use <strong>+ Text</strong>, <strong>+ Card</strong> or <strong>+ Ellipse</strong> in Layers. Select a layer in the list or on the artwork, then drag it to move it. Edit its text, position, size, rotation, colour and opacity using the controls. Forward and Backward change stacking; Visible hides a layer; Delete removes it. Undo and Redo help you reverse edits.</p></li>
        <li><h2>Animate and preview</h2><p>Set Duration and Speed, and choose a layer’s Motion when you want an overlay to move. Use <strong>Play preview</strong> and the time slider below the artwork to inspect the animation. Visual preview does not automatically start sound.</p></li>
        <li><h2>Create sound</h2><p>In the audio controls, choose a waveform or noise, adjust pitch and volume, and use tempo and the rhythm sequence for beats. In the sequence, <strong>1</strong> plays a step and <strong>0</strong> leaves it silent. Use <strong>Play sound</strong> to listen and stop it when finished. Start at a low volume. Enable <strong>Include audio</strong> to add this synthesized sound to a video.</p></li>
        <li><h2>Export your result</h2><p>Under Export, choose the output size. PNG is suitable for graphics; JPEG uses the quality setting and an opaque background; SVG preserves vector shapes. WAV downloads synthesized audio. For video, choose FPS and bitrate, then record. Recording takes approximately the chosen duration: keep this tab visible. Cancel stops recording without deleting your project.</p><p>Video uses the WebM or MP4 format supported by your browser; it is not a file renamed to another format. Full HD, 4K and 8K stills depend on your device’s memory and browser. 8K video is not supported. If an export fails, try Full HD or a shorter video rather than repeatedly retrying a very large output.</p></li>
        <li><h2>Save a reusable project</h2><p><strong>Save project</strong> downloads an editable project backup, separate from your image, video or audio exports. Use <strong>Open project</strong> to restore that backup. New and Open ask before replacing your work; choose Keep editing to cancel, Download backup to keep a copy, or Discard to replace it.</p><p>“Saved on this device” means a browser draft, not a cloud backup. Clearing browser data, switching devices or losing browser storage can remove that draft. Download a project backup before leaving important work. If another tab changes the draft, follow the warning and save your current project before continuing.</p></li>
      </ol>
      <aside className="bm-guide-tip"><strong>Try your first design:</strong> choose Geometric pattern → add a Text layer → change its words and colour → export PNG → Save project.
        <p><strong>Offline edition:</strong> extract the complete prebuilt ZIP and open index.html in a supported browser. Keep its included files together. If local files are blocked, follow the README’s local-server instructions. Creation and exports need no account, API key or internet connection.</p>
      </aside>
    </div>
  </details>;
}
