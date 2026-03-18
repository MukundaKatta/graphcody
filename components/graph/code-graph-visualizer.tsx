"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import { type SimulationNodeDatum, type SimulationLinkDatum } from "d3";
import type { VisNode, VisEdge, GraphData, NodeKind, EdgeKind } from "@/types";
import { getNodeKindColor, getNodeKindIcon } from "@/lib/utils";

interface SimNode extends SimulationNodeDatum {
  id: string;
  name: string;
  kind: NodeKind;
  filePath: string;
  group: string;
  size: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  kind: EdgeKind;
  strength: number;
}

interface Props {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  layout?: "force" | "tree" | "radial";
}

export function CodeGraphVisualizer({
  data,
  width = 900,
  height = 600,
  onNodeClick,
  onNodeHover,
  selectedNodeId,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: VisNode } | null>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const renderGraph = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (!data.nodes.length) return;

    const { width: w, height: h } = dimensions;

    const nodes: SimNode[] = data.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      kind: n.kind,
      filePath: n.filePath,
      group: n.group,
      size: n.size,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: SimLink[] = data.edges
      .filter((e) => {
        const sourceId = typeof e.source === "string" ? e.source : e.source.id;
        const targetId = typeof e.target === "string" ? e.target : e.target.id;
        return nodeMap.has(sourceId) && nodeMap.has(targetId);
      })
      .map((e) => ({
        source: typeof e.source === "string" ? e.source : e.source.id,
        target: typeof e.target === "string" ? e.target : e.target.id,
        kind: e.kind,
        strength: e.strength,
      }));

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Arrow markers for each edge kind
    const edgeKinds: EdgeKind[] = ["imports", "calls", "extends", "implements", "uses", "defines", "exports", "overrides", "type_of", "returns", "parameter_of", "contains"];
    const edgeColors: Record<string, string> = {
      imports: "#6366f1",
      calls: "#10b981",
      extends: "#f59e0b",
      implements: "#3b82f6",
      uses: "#8b5cf6",
      defines: "#ec4899",
      exports: "#14b8a6",
      overrides: "#ef4444",
      type_of: "#06b6d4",
      returns: "#f97316",
      parameter_of: "#6b7280",
      contains: "#d1d5db",
    };

    edgeKinds.forEach((kind) => {
      svg
        .append("defs")
        .append("marker")
        .attr("id", `arrow-${kind}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", edgeColors[kind] || "#999");
    });

    // Simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(80)
          .strength((d) => d.strength * 0.3)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius(25));

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => edgeColors[d.kind] || "#999")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .attr("marker-end", (d) => `url(#arrow-${d.kind})`);

    // Node groups
    const node = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => 6 + Math.min(d.size, 20))
      .attr("fill", (d) => getNodeKindColor(d.kind))
      .attr("stroke", (d) =>
        d.id === selectedNodeId ? "#1e1b4b" : "white"
      )
      .attr("stroke-width", (d) => (d.id === selectedNodeId ? 3 : 2))
      .attr("opacity", 0.9);

    // Node labels
    node
      .append("text")
      .text((d) => getNodeKindIcon(d.kind))
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .attr("pointer-events", "none");

    // Name labels
    node
      .append("text")
      .text((d) => d.name.length > 20 ? d.name.slice(0, 18) + ".." : d.name)
      .attr("x", (d) => 10 + Math.min(d.size, 20))
      .attr("dy", "0.35em")
      .attr("font-size", "11px")
      .attr("fill", "#334155")
      .attr("pointer-events", "none");

    // Interactions
    node.on("click", (_, d) => onNodeClick?.(d.id));

    node.on("mouseenter", (event, d) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
          node: d as unknown as VisNode,
        });
      }
      onNodeHover?.(d.id);

      // Highlight connected
      const connectedIds = new Set<string>();
      links.forEach((l) => {
        const sid = typeof l.source === "object" ? (l.source as SimNode).id : l.source;
        const tid = typeof l.target === "object" ? (l.target as SimNode).id : l.target;
        if (sid === d.id) connectedIds.add(tid as string);
        if (tid === d.id) connectedIds.add(sid as string);
      });

      node.select("circle").attr("opacity", (n) =>
        n.id === d.id || connectedIds.has(n.id) ? 1 : 0.2
      );
      link.attr("stroke-opacity", (l) => {
        const sid = typeof l.source === "object" ? (l.source as SimNode).id : l.source;
        const tid = typeof l.target === "object" ? (l.target as SimNode).id : l.target;
        return sid === d.id || tid === d.id ? 0.8 : 0.05;
      });
    });

    node.on("mouseleave", () => {
      setTooltip(null);
      onNodeHover?.(null);
      node.select("circle").attr("opacity", 0.9);
      link.attr("stroke-opacity", 0.4);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x!)
        .attr("y1", (d) => (d.source as SimNode).y!)
        .attr("x2", (d) => (d.target as SimNode).x!)
        .attr("y2", (d) => (d.target as SimNode).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Initial zoom to fit
    setTimeout(() => {
      const bounds = g.node()?.getBBox();
      if (bounds) {
        const fullW = bounds.width + 100;
        const fullH = bounds.height + 100;
        const scale = Math.min(w / fullW, h / fullH, 1.5);
        const tx = w / 2 - (bounds.x + bounds.width / 2) * scale;
        const ty = h / 2 - (bounds.y + bounds.height / 2) * scale;
        svg.transition().duration(500).call(
          zoom.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
      }
    }, 1000);

    return () => {
      simulation.stop();
    };
  }, [data, dimensions, selectedNodeId, onNodeClick, onNodeHover]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px] bg-surface-50 rounded-xl border border-surface-200 overflow-hidden">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {tooltip && (
        <div
          className="absolute pointer-events-none bg-white rounded-lg shadow-lg border border-surface-200 px-3 py-2 z-10"
          style={{ left: tooltip.x + 15, top: tooltip.y - 40 }}
        >
          <p className="text-sm font-semibold text-surface-800">{tooltip.node.name}</p>
          <p className="text-xs text-surface-700/60">{tooltip.node.kind} - {tooltip.node.filePath}</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg border border-surface-200 px-3 py-2">
        <p className="text-xs font-medium text-surface-700 mb-1">Node Types</p>
        <div className="flex flex-wrap gap-2">
          {["function", "class", "module", "interface", "component"].map((kind) => (
            <div key={kind} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getNodeKindColor(kind) }}
              />
              <span className="text-[10px] text-surface-700/60">{kind}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
