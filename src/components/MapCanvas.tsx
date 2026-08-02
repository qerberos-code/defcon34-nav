import { useRef } from 'react';
import type { EditorTool, NavPack, Point, Selection } from '../types';

interface Props {
  pack: NavPack;
  activeTool?: EditorTool;
  selection?: Selection;
  route?: Point[];
  calibrationPoints?: Point[];
  interactive?: boolean;
  showGraph?: boolean;
  onMapClick?: (point: Point) => void;
  onNodeActivate?: (id: string) => void;
  onObjectSelect?: (selection: NonNullable<Selection>) => void;
  onMoveNode?: (id: string, point: Point) => void;
}

const toSvg = (value: number) => value * 1000;

export function MapCanvas({ pack, activeTool = 'select', selection, route, calibrationPoints = [], interactive = false, showGraph = false, onMapClick, onNodeActivate, onObjectSelect, onMoveNode }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<string | null>(null);
  const pointerPoint = (event: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };
  const nodeMap = new Map(pack.nodes.map((node) => [node.id, node]));
  const routeText = route?.map((point) => `${toSvg(point.x)},${toSvg(point.y)}`).join(' ');

  return <div className="map-frame" aria-label="Floor plan map">
    <img src={pack.floor.imageDataUrl} alt={`${pack.event.name} floor plan`} draggable={false} />
    <svg ref={svgRef} className={`map-overlay tool-${activeTool}`} viewBox="0 0 1000 1000" preserveAspectRatio="none"
      onClick={(event) => { if (event.target === event.currentTarget) onMapClick?.(pointerPoint(event)); }}
      onPointerMove={(event) => { if (dragging.current && onMoveNode) onMoveNode(dragging.current, pointerPoint(event)); }}
      onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}>
      {(showGraph || interactive) && pack.edges.map((edge) => {
        const from = nodeMap.get(edge.fromNodeId); const to = nodeMap.get(edge.toNodeId); if (!from || !to) return null;
        return <line key={edge.id} className={`route-edge ${selection?.type === 'edge' && selection.id === edge.id ? 'selected' : ''}`} x1={toSvg(from.x)} y1={toSvg(from.y)} x2={toSvg(to.x)} y2={toSvg(to.y)} vectorEffect="non-scaling-stroke" onClick={(event) => { event.stopPropagation(); onObjectSelect?.({ type: 'edge', id: edge.id }); }} />;
      })}
      {routeText ? <polyline className="active-route halo" points={routeText} vectorEffect="non-scaling-stroke" /> : null}
      {routeText ? <polyline className="active-route" points={routeText} vectorEffect="non-scaling-stroke" /> : null}
      {pack.destinations.map((item) => <g key={item.id} className={`map-marker destination ${selection?.type === 'destination' && selection.id === item.id ? 'selected' : ''}`} transform={`translate(${toSvg(item.x)} ${toSvg(item.y)})`} onClick={(event) => { event.stopPropagation(); onObjectSelect?.({ type: 'destination', id: item.id }); }}><circle r="18" vectorEffect="non-scaling-stroke"/><path d="M-7 0h14M0-7v14" vectorEffect="non-scaling-stroke"/><title>{item.name}</title></g>)}
      {pack.checkpoints.map((item) => <g key={item.id} className={`map-marker checkpoint ${selection?.type === 'checkpoint' && selection.id === item.id ? 'selected' : ''}`} transform={`translate(${toSvg(item.x)} ${toSvg(item.y)})`} onClick={(event) => { event.stopPropagation(); onObjectSelect?.({ type: 'checkpoint', id: item.id }); }}><path d="M0-22 20 15H-20Z" vectorEffect="non-scaling-stroke"/><text y="9" textAnchor="middle">C</text><title>{item.label}</title></g>)}
      {(showGraph || interactive) && pack.nodes.map((node) => <circle key={node.id} className={`route-node ${selection?.type === 'node' && selection.id === node.id ? 'selected' : ''}`} cx={toSvg(node.x)} cy={toSvg(node.y)} r="11" vectorEffect="non-scaling-stroke" onPointerDown={(event) => { event.stopPropagation(); if (activeTool === 'select' && onMoveNode) { dragging.current = node.id; event.currentTarget.setPointerCapture(event.pointerId); } }} onClick={(event) => { event.stopPropagation(); onNodeActivate?.(node.id); }}><title>Route node</title></circle>)}
      {calibrationPoints.map((point, index) => <g key={index} className="calibration-point" transform={`translate(${toSvg(point.x)} ${toSvg(point.y)})`}><circle r="18" vectorEffect="non-scaling-stroke"/><text y="7" textAnchor="middle">{index + 1}</text></g>)}
    </svg>
  </div>;
}
