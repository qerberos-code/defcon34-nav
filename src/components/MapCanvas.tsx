import { useEffect, useRef, useState } from 'react';
import type { EditorTool, NavPack, Point, Selection } from '../types';

interface Props {
  pack: NavPack;
  activeTool?: EditorTool;
  selection?: Selection;
  route?: Point[];
  calibrationPoints?: Point[];
  interactive?: boolean;
  showGraph?: boolean;
  currentCheckpointId?: string;
  targetCheckpointId?: string;
  onMapClick?: (point: Point) => void;
  onNodeActivate?: (id: string) => void;
  onObjectSelect?: (selection: NonNullable<Selection>) => void;
  onMoveNode?: (id: string, point: Point) => void;
  /** 'all' (default) renders every checkpoint; a Set renders only those ids. */
  visibleCheckpointIds?: 'all' | Set<string>;
  /** 'minimal' renders checkpoints as small unlabeled dot pins (the poster's own text labels the areas). */
  markerStyle?: 'full' | 'minimal';
  /** When set, the viewport zooms and scrolls to frame these normalized points. */
  fitPoints?: Point[];
}

export function MapCanvas({ pack, activeTool = 'select', selection, route, calibrationPoints = [], interactive = false, showGraph = false, currentCheckpointId, targetCheckpointId, onMapClick, onNodeActivate, onObjectSelect, onMoveNode, visibleCheckpointIds = 'all', markerStyle = 'full', fitPoints }: Props) {
  const dragging = useRef<string | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const applyZoom = (next: number) => {
    const clamped = Math.max(1, Math.min(6, next));
    const element = viewport.current;
    if (element && clamped !== zoom) {
      // Keep the viewport centre stable while the content resizes around it.
      const factor = clamped / zoom;
      const centerX = element.scrollLeft + element.clientWidth / 2;
      const centerY = element.scrollTop + element.clientHeight / 2;
      requestAnimationFrame(() => { element.scrollLeft = centerX * factor - element.clientWidth / 2; element.scrollTop = centerY * factor - element.clientHeight / 2; });
    }
    setZoom(clamped);
  };
  const pointerPoint = (event: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };
  const fitKey = fitPoints?.map((point) => `${point.x.toFixed(4)},${point.y.toFixed(4)}`).join(';') ?? '';
  useEffect(() => {
    const element = viewport.current;
    if (!fitKey || !element || !fitPoints?.length) return;
    const xs = fitPoints.map((point) => point.x);
    const ys = fitPoints.map((point) => point.y);
    const pad = 0.05;
    const minX = Math.max(0, Math.min(...xs) - pad), maxX = Math.min(1, Math.max(...xs) + pad);
    const minY = Math.max(0, Math.min(...ys) - pad), maxY = Math.min(1, Math.max(...ys) + pad);
    const baseWidth = element.clientWidth;
    const baseHeight = baseWidth * (pack.floor.imageHeight / Math.max(1, pack.floor.imageWidth));
    const next = Math.max(1, Math.min(6, Math.min(element.clientWidth / Math.max(0.02, maxX - minX) / baseWidth, element.clientHeight / Math.max(0.02, maxY - minY) / baseHeight)));
    setZoom(next);
    requestAnimationFrame(() => {
      element.scrollLeft = ((minX + maxX) / 2) * baseWidth * next - element.clientWidth / 2;
      element.scrollTop = ((minY + maxY) / 2) * baseHeight * next - element.clientHeight / 2;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  const nodeMap = new Map(pack.nodes.map((node) => [node.id, node]));
  const checkpointNodeIds = new Set(pack.checkpoints.map((checkpoint) => checkpoint.routeNodeId));
  const imageWidth = Math.max(1, pack.floor.imageWidth);
  const imageHeight = Math.max(1, pack.floor.imageHeight);
  const markerScale = Math.max(imageWidth, imageHeight) / 1000;
  const toX = (value: number) => value * imageWidth;
  const toY = (value: number) => value * imageHeight;
  const routeText = route?.map((point) => `${toX(point.x)},${toY(point.y)}`).join(' ');

  return <div className="map-shell">
    <div className="map-viewport" ref={viewport}>
    <div className="map-frame" aria-label="Floor plan map" style={{ aspectRatio: `${imageWidth} / ${imageHeight}`, width: `${zoom * 100}%` }}>
    <img src={pack.floor.imageDataUrl} alt={`${pack.event.name} floor plan`} draggable={false} />
    <svg className={`map-overlay tool-${activeTool}`} viewBox={`0 0 ${imageWidth} ${imageHeight}`} preserveAspectRatio="none"
      onClick={(event) => { if (event.target === event.currentTarget) onMapClick?.(pointerPoint(event)); }}
      onPointerMove={(event) => { if (dragging.current && onMoveNode) onMoveNode(dragging.current, pointerPoint(event)); }}
      onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}>
      {(showGraph || interactive) && pack.edges.map((edge) => {
        const from = nodeMap.get(edge.fromNodeId); const to = nodeMap.get(edge.toNodeId); if (!from || !to) return null;
        return <line key={edge.id} className={`route-edge ${selection?.type === 'edge' && selection.id === edge.id ? 'selected' : ''}`} x1={toX(from.x)} y1={toY(from.y)} x2={toX(to.x)} y2={toY(to.y)} vectorEffect="non-scaling-stroke" onClick={(event) => { event.stopPropagation(); onObjectSelect?.({ type: 'edge', id: edge.id }); }} />;
      })}
      {routeText ? <polyline className="active-route halo" points={routeText} vectorEffect="non-scaling-stroke" /> : null}
      {routeText ? <polyline className="active-route" points={routeText} vectorEffect="non-scaling-stroke" /> : null}
      {(showGraph || interactive) && pack.nodes.filter((node) => !checkpointNodeIds.has(node.id)).map((node) => <circle key={node.id} className={`route-node ${selection?.type === 'node' && selection.id === node.id ? 'selected' : ''}`} cx={toX(node.x)} cy={toY(node.y)} r={11 * markerScale} vectorEffect="non-scaling-stroke" onPointerDown={(event) => { event.stopPropagation(); if (activeTool === 'select' && onMoveNode) { dragging.current = node.id; event.currentTarget.setPointerCapture(event.pointerId); } }} onClick={(event) => { event.stopPropagation(); onNodeActivate?.(node.id); }}><title>Intermediate route point</title></circle>)}
      {pack.checkpoints.filter((item) => visibleCheckpointIds === 'all' || visibleCheckpointIds.has(item.id)).map((item) => {
        const position = nodeMap.get(item.routeNodeId) ?? item;
        const selected = (selection?.type === 'checkpoint' && selection.id === item.id) || (selection?.type === 'node' && selection.id === item.routeNodeId);
        const role = item.id === currentCheckpointId ? ' current' : item.id === targetCheckpointId ? ' target' : '';
        return <g key={item.id} className={`map-marker checkpoint ${selected ? 'selected' : ''}${role}`} transform={`translate(${toX(position.x)} ${toY(position.y)}) scale(${markerScale})`}
          onPointerDown={(event) => { event.stopPropagation(); if (activeTool === 'select' && onMoveNode) { dragging.current = item.routeNodeId; event.currentTarget.setPointerCapture(event.pointerId); } }}
          onClick={(event) => { event.stopPropagation(); if (activeTool === 'routes') onNodeActivate?.(item.routeNodeId); else onObjectSelect?.({ type: 'checkpoint', id: item.id }); }}>
          {markerStyle === 'minimal'
            ? <><circle className="dot-pin-ring" r="16" vectorEffect="non-scaling-stroke"/><circle className="dot-pin" r="9"/><title>{item.label}</title></>
            : <><path d="M0-22 20 15H-20Z" vectorEffect="non-scaling-stroke"/><text className="checkpoint-symbol" y="9" textAnchor="middle">C</text><text className="checkpoint-label" x="27" y="5" textAnchor="start">{item.label}</text><title>{`${item.label} checkpoint`}</title></>}
        </g>;
      })}
      {calibrationPoints.map((point, index) => <g key={index} className="calibration-point" transform={`translate(${toX(point.x)} ${toY(point.y)}) scale(${markerScale})`}><circle r="18" vectorEffect="non-scaling-stroke"/><text y="7" textAnchor="middle">{index + 1}</text></g>)}
    </svg>
    </div>
    </div>
    <div className="map-zoom-controls" role="group" aria-label="Map zoom">
      <button type="button" aria-label="Zoom in" onClick={() => applyZoom(zoom * 1.5)}>+</button>
      <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => applyZoom(zoom / 1.5)}>−</button>
      {zoom > 1 ? <button type="button" className="zoom-reset" aria-label="Reset zoom" onClick={() => applyZoom(1)}>1×</button> : null}
    </div>
  </div>;
}
