import { useMemo, type MouseEvent } from "react";

export interface MindmapNode {
  label: string;
  color?: string;
  image?: string;
  children?: MindmapNode[];
}

export interface MindmapData {
  title: string;
  centralTopic: string;
  centralImage?: string;
  branches: MindmapNode[];
  options?: {
    layoutStyle?: string;
    imageStyle?: string;
    imageQuality?: string;
    contentStyle?: string;
    branchCount?: number;
  };
}

interface PBranch {
  label: string;
  color: string;
  image?: string;
  x: number;
  y: number;
  angle: number;
  children: PChild[];
}

interface PChild {
  label: string;
  x: number;
  y: number;
  angle: number;
  children: PDetail[];
}

interface PDetail {
  label: string;
  x: number;
  y: number;
}

const VW = 1500;
const VH = 1300;
const CX = 750;
const CY = 650;
const BRANCH_R = 330;
const CHILD_R = 190;
const DETAIL_R = 115;
const NODE_R = 46;

export const BRANCH_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#F7B731", "#BB8FCE", "#FF8C42", "#5FB3E4",
  "#E17055", "#00CEC9", "#FDCB6E", "#6C5CE7",
];

function computeLayout(branches: MindmapNode[]): PBranch[] {
  const n = branches.length;
  return branches.map((branch, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const bx = CX + Math.cos(angle) * BRANCH_R;
    const by = CY + Math.sin(angle) * BRANCH_R;
    const color = branch.color || BRANCH_COLORS[i % BRANCH_COLORS.length];

    const children: PChild[] = (branch.children || []).map((child, j) => {
      const nc = (branch.children || []).length;
      const spread = nc <= 1 ? 0 : nc <= 2 ? 0.52 : nc <= 3 ? 0.44 : 0.38;
      const ca = angle + (j - (nc - 1) / 2) * spread;
      const cx2 = bx + Math.cos(ca) * CHILD_R;
      const cy2 = by + Math.sin(ca) * CHILD_R;

      const details: PDetail[] = (child.children || []).map((gc, k) => {
        const ngc = (child.children || []).length;
        const ga = ca + (k - (ngc - 1) / 2) * 0.46;
        return { label: gc.label, x: cx2 + Math.cos(ga) * DETAIL_R, y: cy2 + Math.sin(ga) * DETAIL_R };
      });

      return { label: child.label, x: cx2, y: cy2, angle: ca, children: details };
    });

    return { label: branch.label, color, image: branch.image, x: bx, y: by, angle, children };
  });
}

function qBezier(x1: number, y1: number, x2: number, y2: number, bend = 0.22): string {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const nx = (-dy / len) * len * bend;
  const ny = (dx / len) * len * bend;
  return `M ${x1} ${y1} Q ${mx + nx} ${my + ny} ${x2} ${y2}`;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}

function SvgText({ x, y, text, maxChars, fs, fw, fill, anchor }: {
  x: number; y: number; text: string; maxChars: number;
  fs: number; fw?: string; fill?: string; anchor?: string;
}) {
  const lines = wrapText(text, maxChars);
  const lh = fs * 1.3;
  const oy = -((lines.length - 1) * lh) / 2;
  return (
    <>
      {lines.map((l, i) => (
        <text
          key={i}
          x={x}
          y={y + oy + i * lh}
          fontSize={fs}
          fontWeight={fw || "normal"}
          fill={fill || "#1f2937"}
          textAnchor={anchor || "middle"}
          dominantBaseline="middle"
          style={{ fontFamily: "inherit" }}
        >
          {l}
        </text>
      ))}
    </>
  );
}

export interface MindmapCanvasProps {
  data: MindmapData;
  onNodeClick?: (nodeId: string, currentLabel: string) => void;
  onBranchColorClick?: (branchIdx: number, currentColor: string, e: MouseEvent) => void;
  editable?: boolean;
}

function RadialMap({ data, pos, onNodeClick, onBranchColorClick, editable }: {
  data: MindmapData; pos: PBranch[];
  onNodeClick?: MindmapCanvasProps["onNodeClick"];
  onBranchColorClick?: MindmapCanvasProps["onBranchColorClick"];
  editable?: boolean;
}) {
  const clickStyle = editable ? { cursor: "pointer" } : {};
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ background: "white", display: "block" }}>
      <defs>
        {data.centralImage && (
          <clipPath id="rc-center">
            <circle cx={CX} cy={CY} r={60} />
          </clipPath>
        )}
        {pos.map((b, i) => b.image && (
          <clipPath key={i} id={`rc-b${i}`}>
            <circle cx={b.x} cy={b.y} r={NODE_R} />
          </clipPath>
        ))}
      </defs>

      {pos.map((b, i) => (
        <g key={i}>
          <path d={qBezier(CX, CY, b.x, b.y, 0.2)} fill="none" stroke={b.color} strokeWidth={4.5} strokeOpacity={0.8} strokeLinecap="round" />
          {b.children.map((c, j) => (
            <g key={j}>
              <path d={qBezier(b.x, b.y, c.x, c.y, 0.15)} fill="none" stroke={b.color} strokeWidth={2.5} strokeOpacity={0.65} strokeLinecap="round" />
              {c.children.map((d, k) => (
                <path key={k} d={qBezier(c.x, c.y, d.x, d.y, 0.1)} fill="none" stroke={b.color} strokeWidth={1.5} strokeOpacity={0.4} strokeDasharray="5 3" strokeLinecap="round" />
              ))}
            </g>
          ))}
        </g>
      ))}

      {pos.map((b, i) => b.children.map((c, j) => c.children.map((d, k) => (
        <g key={`d-${i}-${j}-${k}`} style={clickStyle} onClick={() => onNodeClick?.(`detail-${i}-${j}-${k}`, d.label)}>
          <rect x={d.x - 36} y={d.y - 12} width={72} height={24} rx={12} fill={`${b.color}22`} stroke={`${b.color}55`} strokeWidth={1} />
          <SvgText x={d.x} y={d.y} text={d.label} maxChars={9} fs={9.5} fill={b.color} />
        </g>
      ))))}

      {pos.map((b, i) => b.children.map((c, j) => {
        const ls = wrapText(c.label, 10);
        const h = ls.length * 14 + 12;
        return (
          <g key={`c-${i}-${j}`} style={clickStyle} onClick={() => onNodeClick?.(`child-${i}-${j}`, c.label)}>
            <rect x={c.x - 34} y={c.y - h / 2} width={68} height={h} rx={h / 2} fill={`${b.color}22`} stroke={b.color} strokeWidth={2} />
            <SvgText x={c.x} y={c.y} text={c.label} maxChars={10} fs={10} fw="600" fill={b.color} />
          </g>
        );
      }))}

      {pos.map((b, i) => {
        const lx = b.x + Math.cos(b.angle) * (NODE_R + 26);
        const ly = b.y + Math.sin(b.angle) * (NODE_R + 28);
        const anchor = Math.cos(b.angle) > 0.2 ? "start" : Math.cos(b.angle) < -0.2 ? "end" : "middle";
        return (
          <g key={`b-${i}`}>
            <circle cx={b.x + 2} cy={b.y + 3} r={NODE_R + 1} fill="rgba(0,0,0,0.1)" />
            <circle
              cx={b.x} cy={b.y} r={NODE_R}
              fill={b.image ? "white" : b.color}
              stroke={b.color} strokeWidth={3.5}
              style={clickStyle}
              onClick={(e) => { e.stopPropagation(); onBranchColorClick?.(i, b.color, e); }}
            />
            {b.image && (
              <image href={b.image} x={b.x - NODE_R} y={b.y - NODE_R} width={NODE_R * 2} height={NODE_R * 2} clipPath={`url(#rc-b${i})`} preserveAspectRatio="xMidYMid slice" style={{ pointerEvents: "none" }} />
            )}
            {!b.image && (
              <SvgText x={b.x} y={b.y} text={b.label.charAt(0)} maxChars={1} fs={22} fw="bold" fill="white" />
            )}
            <g style={clickStyle} onClick={() => onNodeClick?.(`branch-${i}`, b.label)}>
              <SvgText x={lx} y={ly} text={b.label} maxChars={13} fs={13} fw="bold" fill={b.color} anchor={anchor} />
            </g>
          </g>
        );
      })}

      <circle cx={CX + 2} cy={CY + 4} r={64} fill="rgba(0,0,0,0.12)" />
      <circle cx={CX} cy={CY} r={63} fill={data.centralImage ? "white" : "#7c3aed"} stroke="#7c3aed" strokeWidth={4} />
      {data.centralImage && (
        <image href={data.centralImage} x={CX - 60} y={CY - 60} width={120} height={120} clipPath="url(#rc-center)" preserveAspectRatio="xMidYMid slice" />
      )}
      <g style={clickStyle} onClick={() => onNodeClick?.("central", data.centralTopic || data.title)}>
        {!data.centralImage && (
          <SvgText x={CX} y={CY} text={data.centralTopic || data.title} maxChars={13} fs={15} fw="bold" fill="white" />
        )}
        {data.centralImage && (
          <SvgText x={CX} y={CY + 76} text={data.centralTopic || data.title} maxChars={15} fs={14} fw="bold" fill="#7c3aed" />
        )}
      </g>
    </svg>
  );
}

function SketchMap({ data, pos, onNodeClick, onBranchColorClick, editable }: {
  data: MindmapData; pos: PBranch[];
  onNodeClick?: MindmapCanvasProps["onNodeClick"];
  onBranchColorClick?: MindmapCanvasProps["onBranchColorClick"];
  editable?: boolean;
}) {
  const clickStyle = editable ? { cursor: "pointer" } : {};
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ background: "#fffef5", display: "block" }}>
      <defs>
        <marker id="sk-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="#444" />
        </marker>
        <marker id="sk-arrow-sm" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0.5 L4,2.5 L0,4.5 Z" fill="#777" />
        </marker>
      </defs>

      {Array.from({ length: 38 }).map((_, i) => (
        <line key={i} x1={0} y1={i * 26 + 14} x2={VW} y2={i * 26 + 14} stroke="#e8e5d0" strokeWidth={0.7} />
      ))}
      <line x1={70} y1={0} x2={70} y2={VH} stroke="#f0b8b8" strokeWidth={1} />

      {pos.map((b, i) => (
        <g key={i}>
          <line x1={CX} y1={CY} x2={b.x} y2={b.y} stroke="#555" strokeWidth={2} markerEnd="url(#sk-arrow)" />
          {b.children.map((c, j) => (
            <g key={j}>
              <line x1={b.x} y1={b.y} x2={c.x} y2={c.y} stroke="#777" strokeWidth={1.3} markerEnd="url(#sk-arrow-sm)" />
              {c.children.map((d, k) => (
                <line key={k} x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="#aaa" strokeWidth={0.9} strokeDasharray="4 3" />
              ))}
            </g>
          ))}
        </g>
      ))}

      {pos.map((b, i) => b.children.map((c, j) => c.children.map((d, k) => (
        <g key={`d-${i}-${j}-${k}`} style={clickStyle} onClick={() => onNodeClick?.(`detail-${i}-${j}-${k}`, d.label)}>
          <SvgText x={d.x} y={d.y} text={`→ ${d.label}`} maxChars={10} fs={9.5} fill="#666" />
        </g>
      ))))}

      {pos.map((b, i) => b.children.map((c, j) => {
        const ls = wrapText(c.label, 11);
        const w = 72, h = ls.length * 14 + 12;
        return (
          <g key={`c-${i}-${j}`} style={clickStyle} onClick={() => onNodeClick?.(`child-${i}-${j}`, c.label)}>
            <rect x={c.x - w / 2} y={c.y - h / 2} width={w} height={h} rx={5} fill="white" stroke="#555" strokeWidth={1.8} />
            <SvgText x={c.x} y={c.y} text={c.label} maxChars={11} fs={10.5} fill="#333" />
          </g>
        );
      }))}

      {pos.map((b, i) => (
        <g key={`b-${i}`}>
          <ellipse cx={b.x + 1} cy={b.y + 2} rx={54} ry={33} fill="rgba(0,0,0,0.07)" />
          <ellipse
            cx={b.x} cy={b.y} rx={54} ry={33}
            fill="#fffef5" stroke="#333" strokeWidth={2.2}
            style={clickStyle}
            onClick={(e) => { e.stopPropagation(); onBranchColorClick?.(i, b.color, e); }}
          />
          <g style={clickStyle} onClick={() => onNodeClick?.(`branch-${i}`, b.label)}>
            <SvgText x={b.x} y={b.y} text={b.label} maxChars={10} fs={12} fw="bold" fill="#222" />
          </g>
        </g>
      ))}

      <ellipse cx={CX + 2} cy={CY + 3} rx={84} ry={54} fill="rgba(0,0,0,0.08)" />
      <ellipse cx={CX} cy={CY} rx={84} ry={54} fill="white" stroke="#333" strokeWidth={3} />
      <g style={clickStyle} onClick={() => onNodeClick?.("central", data.centralTopic || data.title)}>
        <SvgText x={CX} y={CY} text={data.centralTopic || data.title} maxChars={14} fs={16} fw="bold" fill="#111" />
      </g>
    </svg>
  );
}

function InfographicMap({ data, pos, onNodeClick, onBranchColorClick, editable }: {
  data: MindmapData; pos: PBranch[];
  onNodeClick?: MindmapCanvasProps["onNodeClick"];
  onBranchColorClick?: MindmapCanvasProps["onBranchColorClick"];
  editable?: boolean;
}) {
  const clickStyle = editable ? { cursor: "pointer" } : {};
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ background: "#0f172a", display: "block" }}>
      <defs>
        {data.centralImage && (
          <clipPath id="ic-center">
            <circle cx={CX} cy={CY} r={58} />
          </clipPath>
        )}
        {pos.map((b, i) => b.image && (
          <clipPath key={i} id={`ic-b${i}`}>
            <circle cx={b.x} cy={b.y} r={50} />
          </clipPath>
        ))}
        <marker id="ig-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="rgba(255,255,255,0.45)" />
        </marker>
        <filter id="ig-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {Array.from({ length: 20 }).map((_, ri) =>
        Array.from({ length: 24 }).map((_, ci) => (
          <circle key={`${ri}-${ci}`} cx={ci * 48 + 8} cy={ri * 50 + 8} r={1.2} fill="rgba(255,255,255,0.06)" />
        ))
      )}

      {pos.map((b, i) => (
        <g key={i}>
          <line x1={CX} y1={CY} x2={b.x} y2={b.y} stroke={b.color} strokeWidth={2.5} strokeOpacity={0.65} markerEnd="url(#ig-arrow)" />
          {b.children.map((c, j) => (
            <g key={j}>
              <line x1={b.x} y1={b.y} x2={c.x} y2={c.y} stroke={b.color} strokeWidth={1.5} strokeOpacity={0.5} />
              {c.children.map((d, k) => (
                <line key={k} x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="4 3" />
              ))}
            </g>
          ))}
        </g>
      ))}

      {pos.map((b, i) => b.children.map((c, j) => c.children.map((d, k) => (
        <g key={`d-${i}-${j}-${k}`} style={clickStyle} onClick={() => onNodeClick?.(`detail-${i}-${j}-${k}`, d.label)}>
          <rect x={d.x - 34} y={d.y - 12} width={68} height={24} rx={12} fill={`${b.color}30`} stroke={`${b.color}70`} strokeWidth={1} />
          <SvgText x={d.x} y={d.y} text={d.label} maxChars={9} fs={9} fill="rgba(255,255,255,0.8)" />
        </g>
      ))))}

      {pos.map((b, i) => b.children.map((c, j) => (
        <g key={`c-${i}-${j}`} style={clickStyle} onClick={() => onNodeClick?.(`child-${i}-${j}`, c.label)}>
          <circle cx={c.x} cy={c.y} r={33} fill={`${b.color}35`} stroke={b.color} strokeWidth={2} />
          <SvgText x={c.x} y={c.y} text={c.label} maxChars={9} fs={9.5} fw="500" fill="white" />
        </g>
      )))}

      {pos.map((b, i) => {
        const lx = b.x + Math.cos(b.angle) * (52 + 30);
        const ly = b.y + Math.sin(b.angle) * (52 + 32);
        const anchor = Math.cos(b.angle) > 0.2 ? "start" : Math.cos(b.angle) < -0.2 ? "end" : "middle";
        return (
          <g key={`b-${i}`}>
            <circle cx={b.x} cy={b.y} r={55} fill={b.color} opacity={0.2} filter="url(#ig-glow)" />
            <circle
              cx={b.x} cy={b.y} r={50}
              fill={`${b.color}cc`}
              style={clickStyle}
              onClick={(e) => { e.stopPropagation(); onBranchColorClick?.(i, b.color, e); }}
            />
            {b.image && (
              <>
                <image href={b.image} x={b.x - 50} y={b.y - 50} width={100} height={100} clipPath={`url(#ic-b${i})`} preserveAspectRatio="xMidYMid slice" opacity={0.9} style={{ pointerEvents: "none" }} />
                <circle cx={b.x} cy={b.y} r={50} fill={b.color} opacity={0.25} style={{ pointerEvents: "none" }} />
              </>
            )}
            {!b.image && (
              <SvgText x={b.x} y={b.y} text={b.label.charAt(0)} maxChars={1} fs={26} fw="bold" fill="white" />
            )}
            <g style={clickStyle} onClick={() => onNodeClick?.(`branch-${i}`, b.label)}>
              <SvgText x={lx} y={ly} text={b.label} maxChars={11} fs={11} fw="bold" fill="white" anchor={anchor} />
            </g>
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r={70} fill="#1e293b" stroke="#7c3aed" strokeWidth={4} filter="url(#ig-glow)" />
      <circle cx={CX} cy={CY} r={62} fill={data.centralImage ? "#1e293b" : "#7c3aed"} />
      {data.centralImage && (
        <>
          <image href={data.centralImage} x={CX - 58} y={CY - 58} width={116} height={116} clipPath="url(#ic-center)" preserveAspectRatio="xMidYMid slice" opacity={0.9} />
          <circle cx={CX} cy={CY} r={58} fill="#7c3aed" opacity={0.28} />
        </>
      )}
      <g style={clickStyle} onClick={() => onNodeClick?.("central", data.centralTopic || data.title)}>
        {!data.centralImage && (
          <SvgText x={CX} y={CY} text={data.centralTopic || data.title} maxChars={13} fs={15} fw="bold" fill="white" />
        )}
        {data.centralImage && (
          <SvgText x={CX} y={CY + 82} text={data.centralTopic || data.title} maxChars={15} fs={14} fw="bold" fill="white" />
        )}
      </g>
    </svg>
  );
}

function PictureBoard({ data, onNodeClick, editable }: {
  data: MindmapData;
  onNodeClick?: MindmapCanvasProps["onNodeClick"];
  editable?: boolean;
}) {
  const branches = data.branches || [];
  const CARD_W = 160;
  const CARD_H = 190;
  const GAP = 20;
  const COLS = Math.min(4, branches.length);
  const ROWS = Math.ceil(branches.length / COLS);
  const HEADER_H = 90;
  const SVG_W = COLS * (CARD_W + GAP) + GAP;
  const SVG_H = HEADER_H + ROWS * (CARD_H + GAP) + GAP;
  const clickStyle = editable ? { cursor: "pointer" } : {};

  const COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#FF8C42","#87CEEB","#F9A8D4","#86EFAC","#FCD34D","#A5B4FC"];

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ background: "#fffef5", display: "block" }}>
      <defs>
        {branches.map((_, i) => (
          <clipPath key={i} id={`pb-img-${i}`}>
            <rect x={0} y={0} width={CARD_W - 16} height={CARD_H - 56} rx={10} />
          </clipPath>
        ))}
        <clipPath id="pb-center-img">
          <circle cx={30} cy={30} r={28} />
        </clipPath>
      </defs>

      <rect x={0} y={0} width={SVG_W} height={HEADER_H} fill="#7c3aed" />
      {data.centralImage && (
        <image href={data.centralImage} x={GAP - 2} y={10} width={60} height={60} clipPath="url(#pb-center-img)" preserveAspectRatio="xMidYMid slice" />
      )}
      <g style={clickStyle} onClick={() => onNodeClick?.("central", data.centralTopic || data.title)}>
        <text x={data.centralImage ? GAP + 70 : SVG_W / 2} y={HEADER_H / 2 - 6} fontFamily="system-ui, sans-serif" fontSize={22} fontWeight="bold" fill="white" textAnchor={data.centralImage ? "start" : "middle"} dominantBaseline="middle">{data.centralTopic || data.title}</text>
      </g>
      <text x={data.centralImage ? GAP + 70 : SVG_W / 2} y={HEADER_H / 2 + 20} fontFamily="system-ui, sans-serif" fontSize={13} fill="rgba(255,255,255,0.75)" textAnchor={data.centralImage ? "start" : "middle"}>Vocabulary Picture Board</text>

      {branches.map((b, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cx = GAP + col * (CARD_W + GAP);
        const cy = HEADER_H + GAP + row * (CARD_H + GAP);
        const color = b.color || COLORS[i % COLORS.length];
        const imgX = cx + 8;
        const imgY = cy + 8;
        const imgW = CARD_W - 16;
        const imgH = CARD_H - 56;
        return (
          <g key={i} style={clickStyle} onClick={() => onNodeClick?.(`branch-${i}`, b.label)}>
            <rect x={cx + 3} y={cy + 4} width={CARD_W} height={CARD_H} rx={14} fill="rgba(0,0,0,0.1)" />
            <rect x={cx} y={cy} width={CARD_W} height={CARD_H} rx={14} fill="white" stroke={color} strokeWidth={3} />
            {b.image ? (
              <>
                <rect x={imgX} y={imgY} width={imgW} height={imgH} rx={10} fill="#f8f8f8" />
                <image href={b.image} x={imgX} y={imgY} width={imgW} height={imgH} clipPath={`url(#pb-img-${i})`} preserveAspectRatio="xMidYMid slice" />
              </>
            ) : (
              <>
                <rect x={imgX} y={imgY} width={imgW} height={imgH} rx={10} fill={`${color}25`} />
                <text x={cx + CARD_W / 2} y={imgY + imgH / 2} fontFamily="system-ui" fontSize={48} textAnchor="middle" dominantBaseline="middle" fill={color}>{b.label.charAt(0)}</text>
              </>
            )}
            <rect x={cx} y={cy + CARD_H - 44} width={CARD_W} height={44} rx={14} fill={color} />
            <rect x={cx} y={cy + CARD_H - 44} width={CARD_W} height={20} fill={color} />
            <text x={cx + CARD_W / 2} y={cy + CARD_H - 18} fontFamily="system-ui, sans-serif" fontSize={15} fontWeight="bold" fill="white" textAnchor="middle" dominantBaseline="middle">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function MindmapCanvas({ data, onNodeClick, onBranchColorClick, editable }: MindmapCanvasProps) {
  const pos = useMemo(() => computeLayout(data.branches || []), [data.branches]);
  const style = data.options?.layoutStyle || "radial";

  return (
    <div id="mindmap-svg-root" className="w-full overflow-auto rounded-xl">
      {style === "sketch" ? (
        <SketchMap data={data} pos={pos} onNodeClick={onNodeClick} onBranchColorClick={onBranchColorClick} editable={editable} />
      ) : style === "infographic" ? (
        <InfographicMap data={data} pos={pos} onNodeClick={onNodeClick} onBranchColorClick={onBranchColorClick} editable={editable} />
      ) : style === "pictureboard" ? (
        <PictureBoard data={data} onNodeClick={onNodeClick} editable={editable} />
      ) : (
        <RadialMap data={data} pos={pos} onNodeClick={onNodeClick} onBranchColorClick={onBranchColorClick} editable={editable} />
      )}
    </div>
  );
}
