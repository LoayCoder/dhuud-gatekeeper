// Pure SVG Workflow Diagram Renderer
// No external dependencies - generates SVG flowchart from workflow definitions

import { WorkflowDefinition, WorkflowStep, WorkflowConnection, NodeType } from './workflow-definitions';

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutResult {
  positions: Map<string, NodePosition>;
  width: number;
  height: number;
}

// Node styling configuration
const NODE_CONFIG = {
  start: { fill: 'hsl(142, 76%, 36%)', stroke: 'hsl(142, 76%, 28%)', textColor: '#ffffff', rx: 20 },
  end: { fill: 'hsl(0, 84%, 60%)', stroke: 'hsl(0, 84%, 50%)', textColor: '#ffffff', rx: 20 },
  action: { fill: 'hsl(217, 91%, 60%)', stroke: 'hsl(217, 91%, 50%)', textColor: '#ffffff', rx: 8 },
  decision: { fill: 'hsl(45, 93%, 47%)', stroke: 'hsl(45, 93%, 40%)', textColor: '#000000', rx: 0 },
  approval: { fill: 'hsl(270, 76%, 60%)', stroke: 'hsl(270, 76%, 50%)', textColor: '#ffffff', rx: 0 },
  subprocess: { fill: 'hsl(199, 89%, 48%)', stroke: 'hsl(199, 89%, 38%)', textColor: '#ffffff', rx: 8 },
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const DECISION_SIZE = 80;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 100;
const ARROW_SIZE = 8;

// Calculate layout positions for nodes
function calculateLayout(workflow: WorkflowDefinition): LayoutResult {
  const positions = new Map<string, NodePosition>();
  const visited = new Set<string>();
  const levels = new Map<string, number>();
  const columns = new Map<string, number>();
  
  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  workflow.connections.forEach(conn => {
    if (!adjacency.has(conn.from)) adjacency.set(conn.from, []);
    adjacency.get(conn.from)!.push(conn.to);
  });
  
  // BFS to assign levels
  const queue: { id: string; level: number }[] = [];
  const startNode = workflow.steps.find(s => s.type === 'start');
  if (startNode) {
    queue.push({ id: startNode.id, level: 0 });
    levels.set(startNode.id, 0);
  }
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    
    const children = adjacency.get(id) || [];
    children.forEach((childId, idx) => {
      if (!levels.has(childId) || levels.get(childId)! < level + 1) {
        levels.set(childId, level + 1);
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }
  
  // Group nodes by level
  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, id) => {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(id);
  });
  
  // Assign columns within each level
  levelGroups.forEach((ids, level) => {
    ids.forEach((id, idx) => {
      columns.set(id, idx - Math.floor(ids.length / 2));
    });
  });
  
  // Calculate positions
  const maxLevel = Math.max(...Array.from(levels.values()));
  const maxColumns = Math.max(...Array.from(levelGroups.values()).map(g => g.length));
  
  const totalWidth = Math.max(600, maxColumns * (NODE_WIDTH + HORIZONTAL_GAP) + 100);
  const totalHeight = (maxLevel + 1) * (NODE_HEIGHT + VERTICAL_GAP) + 100;
  const centerX = totalWidth / 2;
  
  workflow.steps.forEach(step => {
    const level = levels.get(step.id) ?? 0;
    const column = columns.get(step.id) ?? 0;
    
    const width = step.type === 'decision' ? DECISION_SIZE : NODE_WIDTH;
    const height = step.type === 'decision' ? DECISION_SIZE : NODE_HEIGHT;
    
    positions.set(step.id, {
      x: centerX + column * (NODE_WIDTH + HORIZONTAL_GAP) - width / 2,
      y: 50 + level * (NODE_HEIGHT + VERTICAL_GAP),
      width,
      height,
    });
  });
  
  return { positions, width: totalWidth, height: totalHeight };
}

// Generate node shape SVG
function renderNode(step: WorkflowStep, pos: NodePosition, isRtl: boolean): string {
  const config = NODE_CONFIG[step.type];
  const label = isRtl ? step.labelAr : step.label;
  const actor = isRtl ? step.actorAr : step.actor;
  
  let shape = '';
  
  if (step.type === 'decision') {
    // Diamond shape
    const cx = pos.x + pos.width / 2;
    const cy = pos.y + pos.height / 2;
    const halfW = pos.width / 2;
    const halfH = pos.height / 2;
    shape = `
      <polygon 
        points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}"
        fill="${config.fill}" 
        stroke="${config.stroke}" 
        stroke-width="2"
      />
    `;
  } else if (step.type === 'approval') {
    // Hexagon shape
    const x = pos.x, y = pos.y, w = pos.width, h = pos.height;
    const inset = 15;
    shape = `
      <polygon 
        points="${x + inset},${y} ${x + w - inset},${y} ${x + w},${y + h/2} ${x + w - inset},${y + h} ${x + inset},${y + h} ${x},${y + h/2}"
        fill="${config.fill}" 
        stroke="${config.stroke}" 
        stroke-width="2"
      />
    `;
  } else if (step.type === 'subprocess') {
    // Double-bordered rectangle
    shape = `
      <rect 
        x="${pos.x}" y="${pos.y}" 
        width="${pos.width}" height="${pos.height}" 
        rx="${config.rx}" 
        fill="${config.fill}" 
        stroke="${config.stroke}" 
        stroke-width="2"
      />
      <rect 
        x="${pos.x + 6}" y="${pos.y + 6}" 
        width="${pos.width - 12}" height="${pos.height - 12}" 
        rx="${config.rx - 2}" 
        fill="none" 
        stroke="${config.textColor}" 
        stroke-width="1"
        opacity="0.5"
      />
    `;
  } else {
    // Rounded rectangle
    shape = `
      <rect 
        x="${pos.x}" y="${pos.y}" 
        width="${pos.width}" height="${pos.height}" 
        rx="${config.rx}" 
        fill="${config.fill}" 
        stroke="${config.stroke}" 
        stroke-width="2"
      />
    `;
  }
  
  // Text (word-wrapped)
  const textX = pos.x + pos.width / 2;
  const textY = pos.y + pos.height / 2;
  const fontSize = step.type === 'decision' ? 10 : 11;
  const maxChars = step.type === 'decision' ? 12 : 20;
  
  // Simple word wrap
  const words = label.split(' ');
  let lines: string[] = [];
  let currentLine = '';
  
  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);
  
  const lineHeight = fontSize + 2;
  const startY = textY - ((lines.length - 1) * lineHeight) / 2;
  
  const textElements = lines.map((line, i) => `
    <text 
      x="${textX}" 
      y="${startY + i * lineHeight}" 
      text-anchor="middle" 
      dominant-baseline="middle"
      fill="${config.textColor}" 
      font-size="${fontSize}px" 
      font-family="Rubik, Arial, sans-serif"
      font-weight="500"
      direction="${isRtl ? 'rtl' : 'ltr'}"
    >${escapeXml(line)}</text>
  `).join('');
  
  // Actor badge
  let actorBadge = '';
  if (actor && step.type !== 'decision') {
    actorBadge = `
      <rect 
        x="${pos.x + pos.width / 2 - 40}" 
        y="${pos.y + pos.height - 8}" 
        width="80" height="16" 
        rx="8" 
        fill="rgba(0,0,0,0.3)"
      />
      <text 
        x="${pos.x + pos.width / 2}" 
        y="${pos.y + pos.height}" 
        text-anchor="middle" 
        dominant-baseline="middle"
        fill="#ffffff" 
        font-size="9px" 
        font-family="Rubik, Arial, sans-serif"
        direction="${isRtl ? 'rtl' : 'ltr'}"
      >${escapeXml(actor)}</text>
    `;
  }
  
  return shape + textElements + actorBadge;
}

// Generate connection arrow SVG
function renderConnection(
  conn: WorkflowConnection,
  positions: Map<string, NodePosition>,
  workflow: WorkflowDefinition,
  isRtl: boolean
): string {
  const fromPos = positions.get(conn.from);
  const toPos = positions.get(conn.to);
  if (!fromPos || !toPos) return '';
  
  const fromStep = workflow.steps.find(s => s.id === conn.from);
  const toStep = workflow.steps.find(s => s.id === conn.to);
  
  // Calculate connection points
  let x1, y1, x2, y2;
  
  // From bottom of source to top of target (default)
  x1 = fromPos.x + fromPos.width / 2;
  y1 = fromPos.y + fromPos.height;
  x2 = toPos.x + toPos.width / 2;
  y2 = toPos.y;
  
  // Adjust for horizontal connections
  if (Math.abs(fromPos.y - toPos.y) < NODE_HEIGHT) {
    if (fromPos.x < toPos.x) {
      x1 = fromPos.x + fromPos.width;
      y1 = fromPos.y + fromPos.height / 2;
      x2 = toPos.x;
      y2 = toPos.y + toPos.height / 2;
    } else {
      x1 = fromPos.x;
      y1 = fromPos.y + fromPos.height / 2;
      x2 = toPos.x + toPos.width;
      y2 = toPos.y + toPos.height / 2;
    }
  }
  
  // Adjust for backward connections (loops)
  if (toPos.y < fromPos.y) {
    x1 = fromPos.x;
    y1 = fromPos.y + fromPos.height / 2;
    x2 = toPos.x;
    y2 = toPos.y + toPos.height / 2;
  }
  
  // Calculate control points for bezier curve
  const midY = (y1 + y2) / 2;
  const dx = Math.abs(x2 - x1);
  const curveOffset = Math.min(dx * 0.3, 50);
  
  // Path with bezier curve
  let path;
  if (toPos.y < fromPos.y) {
    // Loop back - curve around
    const loopOffset = 40;
    path = `M ${x1} ${y1} C ${x1 - loopOffset} ${y1}, ${x2 - loopOffset} ${y2}, ${x2} ${y2}`;
  } else if (Math.abs(x1 - x2) < 10) {
    // Straight down
    path = `M ${x1} ${y1} L ${x2} ${y2}`;
  } else {
    // Curved path
    path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  }
  
  // Arrow marker
  const angle = Math.atan2(y2 - midY, x2 - (x1 + x2) / 2);
  const arrowPath = `
    M ${x2} ${y2}
    L ${x2 - ARROW_SIZE * Math.cos(angle - Math.PI / 6)} ${y2 - ARROW_SIZE * Math.sin(angle - Math.PI / 6)}
    L ${x2 - ARROW_SIZE * Math.cos(angle + Math.PI / 6)} ${y2 - ARROW_SIZE * Math.sin(angle + Math.PI / 6)}
    Z
  `;
  
  // Connection label
  let labelSvg = '';
  const label = isRtl ? conn.labelAr : conn.label;
  if (label) {
    const labelX = (x1 + x2) / 2;
    const labelY = (y1 + y2) / 2 - 10;
    
    // Get color based on condition
    let labelBg = 'hsl(210, 40%, 96%)';
    let labelColor = 'hsl(210, 40%, 30%)';
    if (conn.condition === 'approve' || conn.condition === 'yes') {
      labelBg = 'hsl(142, 76%, 90%)';
      labelColor = 'hsl(142, 76%, 30%)';
    } else if (conn.condition === 'reject' || conn.condition === 'no') {
      labelBg = 'hsl(0, 84%, 92%)';
      labelColor = 'hsl(0, 84%, 40%)';
    } else if (conn.condition === 'escalate') {
      labelBg = 'hsl(45, 93%, 90%)';
      labelColor = 'hsl(45, 93%, 30%)';
    }
    
    labelSvg = `
      <rect 
        x="${labelX - 30}" y="${labelY - 8}" 
        width="60" height="16" 
        rx="4" 
        fill="${labelBg}"
      />
      <text 
        x="${labelX}" 
        y="${labelY}" 
        text-anchor="middle" 
        dominant-baseline="middle"
        fill="${labelColor}" 
        font-size="9px" 
        font-family="Rubik, Arial, sans-serif"
        font-weight="500"
        direction="${isRtl ? 'rtl' : 'ltr'}"
      >${escapeXml(label)}</text>
    `;
  }
  
  return `
    <path 
      d="${path}" 
      fill="none" 
      stroke="hsl(210, 40%, 60%)" 
      stroke-width="2"
      stroke-linecap="round"
    />
    <path 
      d="${arrowPath}" 
      fill="hsl(210, 40%, 60%)"
    />
    ${labelSvg}
  `;
}

// Escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Main render function
export interface RenderOptions {
  isRtl?: boolean;
  includeActors?: boolean;
  showLegend?: boolean;
}

export function renderWorkflowSVG(
  workflow: WorkflowDefinition,
  options: RenderOptions = {}
): string {
  const { isRtl = false, showLegend = true } = options;
  
  const layout = calculateLayout(workflow);
  const { positions, width, height } = layout;
  
  // Render connections first (behind nodes)
  const connections = workflow.connections
    .map(conn => renderConnection(conn, positions, workflow, isRtl))
    .join('');
  
  // Render nodes
  const nodes = workflow.steps
    .map(step => {
      const pos = positions.get(step.id);
      if (!pos) return '';
      return renderNode(step, pos, isRtl);
    })
    .join('');
  
  // Legend
  let legend = '';
  if (showLegend) {
    const legendY = height - 60;
    const legendItems = [
      { type: 'start', label: isRtl ? 'بداية/نهاية' : 'Start/End' },
      { type: 'action', label: isRtl ? 'إجراء' : 'Action' },
      { type: 'decision', label: isRtl ? 'قرار' : 'Decision' },
      { type: 'approval', label: isRtl ? 'موافقة' : 'Approval' },
    ];
    
    legend = `
      <g transform="translate(20, ${legendY})">
        <text 
          x="0" y="0" 
          fill="hsl(210, 40%, 30%)" 
          font-size="12px" 
          font-weight="600"
          font-family="Rubik, Arial, sans-serif"
        >${isRtl ? 'مفتاح الرموز' : 'Legend'}</text>
        ${legendItems.map((item, i) => {
          const config = NODE_CONFIG[item.type as NodeType];
          return `
            <rect x="${i * 100}" y="10" width="16" height="16" rx="4" fill="${config.fill}"/>
            <text 
              x="${i * 100 + 22}" y="22" 
              fill="hsl(210, 40%, 30%)" 
              font-size="10px"
              font-family="Rubik, Arial, sans-serif"
            >${item.label}</text>
          `;
        }).join('')}
      </g>
    `;
  }
  
  const svgContent = `
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="${width}" 
      height="${height + (showLegend ? 80 : 0)}"
      viewBox="0 0 ${width} ${height + (showLegend ? 80 : 0)}"
      style="background: white;"
    >
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.15"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        ${connections}
        ${nodes}
      </g>
      ${legend}
    </svg>
  `;
  
  return svgContent.trim();
}

// Export SVG as data URL for preview
export function getSVGDataUrl(svgContent: string): string {
  const encoded = encodeURIComponent(svgContent);
  return `data:image/svg+xml,${encoded}`;
}
