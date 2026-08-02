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
  currentCheckpointId?: string;
  targetCheckpointId?: string;
  onMapClick?: (point: Point) => void;
  onNodeActivate?: (id: string) => void;
  onObjectSelect?: (selection: NonNullable<Selection>) => void;
  onMoveNode?: (id: string, point: Point) => void;
}

export function MapCanvas({ pack, activeTool = 'select', selection, route, calibrationPoints = [], interactive = false, showGraph = false, currentCheckpointId, targetCheckpointId, onMapClick, onNodeActivate, onObjectSelect, onMoveNode }: Props) {
  const dragging = useRef<string | null>(null);
  const pointerPoint = (event: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };
  const nodeMap = new Map(pack.nodes.map((node) => [node.id, node]));
  const checkpointNodeIds = new Set(pack.checkpoints.map((checkpoint) => checkpoint.routeNodeId));
  const imageWidth = Math.max(1, pack.floor.imageWidth);
  const imageHeight = Math.max(1, pack.floor.imageHeight);
  const markerScale = Math.max(imageWidth, imageHeight) / 1000;
  const toX = (value: number) => value * imageWidth;
  const toY = (value: number) => value * imageHeight;
  const routeText = route?.map((point) => `${toX(point.x)},${toY(point.y)}`).join(' ');

  return <div className="map-frame" aria-label="Floor plan map" style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}>
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
      {pack.checkpoints.map((item) => {
        const position = nodeMap.get(item.routeNodeId) ?? item;
        const selected = (selection?.type === 'checkpoint' && selection.id === item.id) || (selection?.type === 'node' && selection.id === item.routeNodeId);
        const role = item.id === currentCheckpointId ? ' current' : item.id === targetCheckpointId ? ' target' : '';
        return <g key={item.id} className={`map-marker checkpoint ${selected ? 'selected' : ''}${role}`} transform={`translate(${toX(position.x)} ${toY(position.y)}) scale(${markerScale})`}
          onPointerDown={(event) => { event.stopPropagation(); if (activeTool === 'select' && onMoveNode) { dragging.current = item.routeNodeId; event.currentTarget.setPointerCapture(event.pointerId); } }}
          onClick={(event) => { event.stopPropagation(); if (activeTool === 'routes') onNodeActivate?.(item.routeNodeId); else onObjectSelect?.({ type: 'checkpoint', id: item.id }); }}>
          <path d="M0-22 20 15H-20Z" vectorEffect="non-scaling-stroke"/><text className="checkpoint-symbol" y="9" textAnchor="middle">C</text><text className="checkpoint-label" x="27" y="5" textAnchor="start">{item.label}</text><title>{`${item.label} checkpoint`}</title>
        </g>;
      })}
      {calibrationPoints.map((point, index) => <g key={index} className="calibration-point" transform={`translate(${toX(point.x)} ${toY(point.y)}) scale(${markerScale})`}><circle r="18" vectorEffect="non-scaling-stroke"/><text y="7" textAnchor="middle">{index + 1}</text></g>)}
    </svg>
  </div>;
}
