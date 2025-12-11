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

// Connection colors based on condition type
const CONNECTION_COLORS = {
  approve: { stroke: 'hsl(142, 76%, 40%)', fill: 'hsl(142, 76%, 40%)' },
  yes: { stroke: 'hsl(142, 76%, 40%)', fill: 'hsl(142, 76%, 40%)' },
  reject: { stroke: 'hsl(0, 84%, 55%)', fill: 'hsl(0, 84%, 55%)' },
  no: { stroke: 'hsl(0, 84%, 55%)', fill: 'hsl(0, 84%, 55%)' },
  escalate: { stroke: 'hsl(35, 93%, 50%)', fill: 'hsl(35, 93%, 50%)' },
  loop: { stroke: 'hsl(210, 40%, 50%)', fill: 'hsl(210, 40%, 50%)' },
  default: { stroke: 'hsl(210, 40%, 45%)', fill: 'hsl(210, 40%, 45%)' },
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const DECISION_SIZE = 90;
const HORIZONTAL_GAP = 120;
const VERTICAL_GAP = 130;
const ARROW_SIZE = 14;
const STROKE_WIDTH = 2.5;

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
    children.forEach((childId) => {
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
  levelGroups.forEach((ids) => {
    ids.forEach((id, idx) => {
      columns.set(id, idx - Math.floor(ids.length / 2));
    });
  });
  
  // Calculate positions
  const maxLevel = Math.max(...Array.from(levels.values()));
  const maxColumns = Math.max(...Array.from(levelGroups.values()).map(g => g.length));
  
  const totalWidth = Math.max(700, maxColumns * (NODE_WIDTH + HORIZONTAL_GAP) + 150);
  const totalHeight = (maxLevel + 1) * (NODE_HEIGHT + VERTICAL_GAP) + 120;
  const centerX = totalWidth / 2;
  
  workflow.steps.forEach(step => {
    const level = levels.get(step.id) ?? 0;
    const column = columns.get(step.id) ?? 0;
    
    const width = step.type === 'decision' ? DECISION_SIZE : NODE_WIDTH;
    const height = step.type === 'decision' ? DECISION_SIZE : NODE_HEIGHT;
    
    positions.set(step.id, {
      x: centerX + column * (NODE_WIDTH + HORIZONTAL_GAP) - width / 2,
      y: 60 + level * (NODE_HEIGHT + VERTICAL_GAP),
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
  const maxChars = step.type === 'decision' ? 14 : 20;
  
  // Simple word wrap
  const words = label.split(' ');
  const lines: string[] = [];
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

// Get connection colors based on condition
function getConnectionColors(condition?: string, isLoop?: boolean) {
  if (isLoop) return CONNECTION_COLORS.loop;
  if (condition === 'approve' || condition === 'yes') return CONNECTION_COLORS.approve;
  if (condition === 'reject' || condition === 'no') return CONNECTION_COLORS.reject;
  if (condition === 'escalate') return CONNECTION_COLORS.escalate;
  return CONNECTION_COLORS.default;
}

// Calculate exit point on diamond edge using parametric calculation
// Given an angle (in radians), find the exact point on the diamond perimeter
function getDiamondEdgePoint(pos: NodePosition, angle: number): { x: number; y: number } {
  const cx = pos.x + pos.width / 2;
  const cy = pos.y + pos.height / 2;
  const halfW = pos.width / 2;
  const halfH = pos.height / 2;
  
  // Normalize angle to 0-2π
  const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  
  // Diamond has 4 edges, each spanning π/2 radians (90 degrees)
  // Top-right edge: -π/4 to π/4 (315° to 45°)
  // Bottom-right edge: π/4 to 3π/4 (45° to 135°)  
  // Bottom-left edge: 3π/4 to 5π/4 (135° to 225°)
  // Top-left edge: 5π/4 to 7π/4 (225° to 315°)
  
  // Use parametric line intersection with diamond edges
  const cos = Math.cos(normalizedAngle);
  const sin = Math.sin(normalizedAngle);
  
  // Calculate intersection with the diamond shape
  // Diamond edges are at 45-degree angles
  let t: number;
  if (Math.abs(cos) * halfH > Math.abs(sin) * halfW) {
    // Intersects left or right edge
    t = halfW / Math.abs(cos);
  } else {
    // Intersects top or bottom edge
    t = halfH / Math.abs(sin);
  }
  
  return {
    x: cx + t * cos * 0.85, // Slightly inward for cleaner look
    y: cy + t * sin * 0.85
  };
}

// Pre-calculate distributed exit points for all connections from a decision node
function getDistributedDecisionExits(
  sourcePos: NodePosition,
  connections: { targetPos: NodePosition; index: number }[],
  workflow: WorkflowDefinition
): Map<number, { x: number; y: number }> {
  const result = new Map<number, { x: number; y: number }>();
  const cx = sourcePos.x + sourcePos.width / 2;
  const cy = sourcePos.y + sourcePos.height / 2;
  
  // Calculate angles to each target and sort
  const angles: { index: number; angle: number; targetBelow: boolean }[] = connections.map(conn => {
    const tx = conn.targetPos.x + conn.targetPos.width / 2;
    const ty = conn.targetPos.y + conn.targetPos.height / 2;
    const angle = Math.atan2(ty - cy, tx - cx);
    return { index: conn.index, angle, targetBelow: ty > cy };
  });
  
  // Sort by angle
  angles.sort((a, b) => a.angle - b.angle);
  
  // Ensure minimum angular separation (25 degrees = ~0.44 radians)
  const MIN_SEPARATION = 0.44;
  for (let i = 1; i < angles.length; i++) {
    const prev = angles[i - 1];
    const curr = angles[i];
    let diff = curr.angle - prev.angle;
    
    if (diff < MIN_SEPARATION) {
      // Spread them apart
      const adjustment = (MIN_SEPARATION - diff) / 2;
      angles[i - 1].angle -= adjustment;
      angles[i].angle += adjustment;
    }
  }
  
  // Calculate exit points
  angles.forEach(({ index, angle }) => {
    const exitPoint = getDiamondEdgePoint(sourcePos, angle);
    result.set(index, exitPoint);
  });
  
  return result;
}

// Generate connection arrow SVG with improved routing
function renderConnection(
  conn: WorkflowConnection,
  positions: Map<string, NodePosition>,
  workflow: WorkflowDefinition,
  isRtl: boolean,
  connectionIndex: number,
  totalConnectionsFromSource: number,
  decisionExitPoints?: Map<number, { x: number; y: number }>
): string {
  const fromPos = positions.get(conn.from);
  const toPos = positions.get(conn.to);
  if (!fromPos || !toPos) return '';
  
  const fromStep = workflow.steps.find(s => s.id === conn.from);
  const isFromDecision = fromStep?.type === 'decision';
  const isLoop = toPos.y < fromPos.y;
  
  const colors = getConnectionColors(conn.condition, isLoop);
  
  let x1: number, y1: number, x2: number, y2: number;
  
  // Smart exit point calculation for decision nodes
  if (isFromDecision && decisionExitPoints && decisionExitPoints.has(connectionIndex)) {
    const exitPoint = decisionExitPoints.get(connectionIndex)!;
    x1 = exitPoint.x;
    y1 = exitPoint.y;
  } else if (isFromDecision) {
    // Fallback: calculate based on target position
    const cx = fromPos.x + fromPos.width / 2;
    const cy = fromPos.y + fromPos.height / 2;
    const tx = toPos.x + toPos.width / 2;
    const ty = toPos.y + toPos.height / 2;
    const angle = Math.atan2(ty - cy, tx - cx);
    const exitPoint = getDiamondEdgePoint(fromPos, angle);
    x1 = exitPoint.x;
    y1 = exitPoint.y;
  } else {
    // Standard exit from bottom center
    x1 = fromPos.x + fromPos.width / 2;
    y1 = fromPos.y + fromPos.height;
  }
  
  // Entry point: top center of target (or side for horizontal/loop)
  x2 = toPos.x + toPos.width / 2;
  y2 = toPos.y;
  
  // Adjust entry point for loops and horizontal connections
  if (isLoop) {
    // Loop back - enter from side
    const loopSide = x1 < x2 ? 'left' : 'right';
    x2 = loopSide === 'left' ? toPos.x : toPos.x + toPos.width;
    y2 = toPos.y + toPos.height / 2;
  } else if (Math.abs(fromPos.y + fromPos.height - toPos.y) < 20) {
    // Nearly horizontal - side to side
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
  
  // Build path with improved routing and staggered offsets
  let path: string;
  const staggerOffset = (connectionIndex - Math.floor(totalConnectionsFromSource / 2)) * 15;
  
  if (isLoop) {
    // Loop connections - route around to the side with unique offset per connection
    const loopOffset = 70 + connectionIndex * 25;
    const goRight = x1 >= x2;
    const sideX = goRight 
      ? Math.max(fromPos.x + fromPos.width, toPos.x + toPos.width) + loopOffset
      : Math.min(fromPos.x, toPos.x) - loopOffset;
    
    path = `M ${x1} ${y1} 
            L ${sideX} ${y1} 
            L ${sideX} ${y2} 
            L ${x2} ${y2}`;
  } else if (Math.abs(x1 - x2) < 10) {
    // Nearly straight vertical - add slight offset if multiple connections
    const offsetX = staggerOffset * 0.3;
    if (Math.abs(offsetX) > 2) {
      const midY = y1 + (y2 - y1) * 0.5;
      path = `M ${x1} ${y1} 
              L ${x1 + offsetX} ${midY} 
              L ${x2 + offsetX} ${midY} 
              L ${x2} ${y2}`;
    } else {
      path = `M ${x1} ${y1} L ${x2} ${y2}`;
    }
  } else {
    // Orthogonal routing with staggered midpoints
    const midYBase = y1 + (y2 - y1) * 0.5;
    const midY = midYBase + staggerOffset;
    path = `M ${x1} ${y1} 
            L ${x1} ${midY} 
            L ${x2} ${midY} 
            L ${x2} ${y2}`;
  }
  
  // Calculate arrow direction based on final segment
  let arrowAngle: number;
  if (isLoop) {
    // Arrow points into the side of target
    arrowAngle = x1 < x2 ? 0 : Math.PI;
  } else if (Math.abs(x1 - x2) < 5) {
    // Straight down
    arrowAngle = Math.PI / 2;
  } else {
    // Orthogonal - final segment is vertical (down)
    arrowAngle = Math.PI / 2;
  }
  
  // Arrow head with proper angle
  const arrowPath = `
    M ${x2} ${y2}
    L ${x2 - ARROW_SIZE * Math.cos(arrowAngle - Math.PI / 5)} ${y2 - ARROW_SIZE * Math.sin(arrowAngle - Math.PI / 5)}
    L ${x2 - ARROW_SIZE * 0.4 * Math.cos(arrowAngle)} ${y2 - ARROW_SIZE * 0.4 * Math.sin(arrowAngle)}
    L ${x2 - ARROW_SIZE * Math.cos(arrowAngle + Math.PI / 5)} ${y2 - ARROW_SIZE * Math.sin(arrowAngle + Math.PI / 5)}
    Z
  `;
  
  // Connection label with improved positioning - offset based on connection index
  let labelSvg = '';
  const label = isRtl ? conn.labelAr : conn.label;
  if (label) {
    let labelX: number, labelY: number;
    const labelStaggerOffset = (connectionIndex - Math.floor(totalConnectionsFromSource / 2)) * 18;
    
    if (isLoop) {
      // Position label on the side loop
      const goRight = x1 >= x2;
      const loopOffset = 70 + connectionIndex * 25;
      labelX = goRight 
        ? Math.max(fromPos.x + fromPos.width, toPos.x + toPos.width) + loopOffset + 10
        : Math.min(fromPos.x, toPos.x) - loopOffset - 10;
      labelY = (y1 + y2) / 2;
    } else {
      // Position label at the horizontal segment with stagger
      const midYBase = y1 + (y2 - y1) * 0.5;
      const midY = midYBase + staggerOffset;
      labelX = (x1 + x2) / 2 + labelStaggerOffset;
      labelY = midY - 15; // Above the path
    }
    
    // Get label background color based on condition
    let labelBg = 'hsl(210, 40%, 96%)';
    let labelColor = 'hsl(210, 40%, 30%)';
    if (conn.condition === 'approve' || conn.condition === 'yes') {
      labelBg = 'hsl(142, 76%, 92%)';
      labelColor = 'hsl(142, 76%, 25%)';
    } else if (conn.condition === 'reject' || conn.condition === 'no') {
      labelBg = 'hsl(0, 84%, 94%)';
      labelColor = 'hsl(0, 84%, 35%)';
    } else if (conn.condition === 'escalate') {
      labelBg = 'hsl(35, 93%, 92%)';
      labelColor = 'hsl(35, 93%, 25%)';
    }
    
    const labelWidth = Math.max(50, label.length * 7);
    
    labelSvg = `
      <rect 
        x="${labelX - labelWidth / 2}" y="${labelY - 10}" 
        width="${labelWidth}" height="20" 
        rx="4" 
        fill="${labelBg}"
        stroke="${colors.stroke}"
        stroke-width="1"
      />
      <text 
        x="${labelX}" 
        y="${labelY}" 
        text-anchor="middle" 
        dominant-baseline="middle"
        fill="${labelColor}" 
        font-size="10px" 
        font-family="Rubik, Arial, sans-serif"
        font-weight="600"
        direction="${isRtl ? 'rtl' : 'ltr'}"
      >${escapeXml(label)}</text>
    `;
  }
  
  // Dashed line style for loop connections
  const strokeDasharray = isLoop ? '6,4' : 'none';
  
  return `
    <path 
      d="${path}" 
      fill="none" 
      stroke="${colors.stroke}" 
      stroke-width="${STROKE_WIDTH}"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-dasharray="${strokeDasharray}"
    />
    <path 
      d="${arrowPath}" 
      fill="${colors.fill}"
      stroke="${colors.stroke}"
      stroke-width="1"
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
  
  // Count connections from each source for smart routing
  const connectionCounts = new Map<string, number>();
  const connectionsBySource = new Map<string, { conn: WorkflowConnection; index: number }[]>();
  
  workflow.connections.forEach((conn, idx) => {
    connectionCounts.set(conn.from, (connectionCounts.get(conn.from) || 0) + 1);
    if (!connectionsBySource.has(conn.from)) {
      connectionsBySource.set(conn.from, []);
    }
    connectionsBySource.get(conn.from)!.push({ conn, index: connectionsBySource.get(conn.from)!.length });
  });
  
  // Pre-calculate distributed exit points for decision nodes
  const decisionExitPointsMap = new Map<string, Map<number, { x: number; y: number }>>();
  
  workflow.steps.forEach(step => {
    if (step.type === 'decision') {
      const sourcePos = positions.get(step.id);
      const conns = connectionsBySource.get(step.id);
      
      if (sourcePos && conns && conns.length > 1) {
        const targetData = conns.map(({ conn, index }) => {
          const targetPos = positions.get(conn.to);
          return { targetPos: targetPos!, index };
        }).filter(d => d.targetPos);
        
        const exitPoints = getDistributedDecisionExits(sourcePos, targetData, workflow);
        decisionExitPointsMap.set(step.id, exitPoints);
      }
    }
  });
  
  // Track connection index per source for offset calculation
  const connectionIndexes = new Map<string, number>();
  
  // Render connections first (behind nodes)
  const connections = workflow.connections
    .map(conn => {
      const currentIndex = connectionIndexes.get(conn.from) || 0;
      connectionIndexes.set(conn.from, currentIndex + 1);
      const totalFromSource = connectionCounts.get(conn.from) || 1;
      const decisionExits = decisionExitPointsMap.get(conn.from);
      return renderConnection(conn, positions, workflow, isRtl, currentIndex, totalFromSource, decisionExits);
    })
    .join('');
  
  // Render nodes
  const nodes = workflow.steps
    .map(step => {
      const pos = positions.get(step.id);
      if (!pos) return '';
      return renderNode(step, pos, isRtl);
    })
    .join('');
  
  // Legend with connection colors
  let legend = '';
  if (showLegend) {
    const legendY = height - 70;
    const nodeItems = [
      { type: 'start', label: isRtl ? 'بداية/نهاية' : 'Start/End' },
      { type: 'action', label: isRtl ? 'إجراء' : 'Action' },
      { type: 'decision', label: isRtl ? 'قرار' : 'Decision' },
      { type: 'approval', label: isRtl ? 'موافقة' : 'Approval' },
    ];
    
    const connectionItems = [
      { color: CONNECTION_COLORS.approve.stroke, label: isRtl ? 'موافقة' : 'Approve' },
      { color: CONNECTION_COLORS.reject.stroke, label: isRtl ? 'رفض' : 'Reject' },
      { color: CONNECTION_COLORS.escalate.stroke, label: isRtl ? 'تصعيد' : 'Escalate' },
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
        ${nodeItems.map((item, i) => {
          const config = NODE_CONFIG[item.type as NodeType];
          return `
            <rect x="${i * 110}" y="12" width="16" height="16" rx="4" fill="${config.fill}"/>
            <text 
              x="${i * 110 + 22}" y="24" 
              fill="hsl(210, 40%, 30%)" 
              font-size="10px"
              font-family="Rubik, Arial, sans-serif"
            >${item.label}</text>
          `;
        }).join('')}
        <text 
          x="${nodeItems.length * 110 + 30}" y="24" 
          fill="hsl(210, 40%, 50%)" 
          font-size="10px"
          font-family="Rubik, Arial, sans-serif"
        >|</text>
        ${connectionItems.map((item, i) => {
          const baseX = nodeItems.length * 110 + 50 + i * 90;
          return `
            <line x1="${baseX}" y1="20" x2="${baseX + 20}" y2="20" stroke="${item.color}" stroke-width="3"/>
            <polygon points="${baseX + 20},20 ${baseX + 14},16 ${baseX + 14},24" fill="${item.color}"/>
            <text 
              x="${baseX + 28}" y="24" 
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
      height="${height + (showLegend ? 90 : 0)}"
      viewBox="0 0 ${width} ${height + (showLegend ? 90 : 0)}"
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
