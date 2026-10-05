import React, { useState, useMemo } from 'react';
import { useKnowledge } from '../../context/KnowledgeContext';
import { KnowledgeObject, ObjectType } from '../../types/knowledge';
import { Network, ArrowRight } from 'lucide-react';

interface TopicsViewProps {
  onSelectObject: (item: KnowledgeObject) => void;
}

export const TopicsView: React.FC<TopicsViewProps> = ({ onSelectObject }) => {
  const { items, allTopics, selectedTopic, setSelectedTopic } = useKnowledge();
  const [activeTopic, setActiveTopic] = useState<string>(selectedTopic || allTopics[0]?.name || 'Human Behavior');
  const [typeFilter, setTypeFilter] = useState<ObjectType | 'all'>('all');

  // Filter items for active topic
  const topicItems = useMemo(() => {
    return items.filter(i => i.topics?.includes(activeTopic));
  }, [items, activeTopic]);

  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return topicItems;
    return topicItems.filter(i => i.type === typeFilter);
  }, [topicItems, typeFilter]);

  // Find related topics (co-occurring topics)
  const relatedTopics = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of topicItems) {
      for (const t of it.topics || []) {
        if (t !== activeTopic) {
          map.set(t, (map.get(t) || 0) + 1);
        }
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [topicItems, activeTopic]);

  // Local knowledge map calculations
  const mapNodes = useMemo(() => {
    const nodes = topicItems.slice(0, 8);
    const count = nodes.length;
    const centerX = 260;
    const centerY = 150;
    const radius = 105;

    return nodes.map((node, idx) => {
      const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return {
        item: node,
        x,
        y,
        angle,
      };
    });
  }, [topicItems]);

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Masthead */}
      <div className="border-b border-theme-subtle pb-5">
        <span className="text-xs uppercase tracking-widest text-muted font-mono">
          Conceptual Lenses
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-main font-normal tracking-tight mt-1">
          Topics & Concepts
        </h1>
        <p className="text-sm text-muted mt-1 max-w-2xl font-serif">
          Topics are not rigid folders; they are lenses through which ideas, films, books, and experiments intersect.
        </p>
      </div>

      {/* Topic Selector Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-theme-subtle">
        {allTopics.map(t => {
          const isActive = t.name === activeTopic;
          return (
            <button
              key={t.name}
              onClick={() => {
                setActiveTopic(t.name);
                setSelectedTopic(t.name);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-surface-subtle text-main font-semibold border border-theme-strong'
                  : 'text-muted hover:text-main hover:bg-surface-hover'
              }`}
            >
              <span>{t.name}</span>
              <span className="text-[10px] font-mono opacity-60">
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Topic Canvas: Local Knowledge Map & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Local Knowledge Map & Related Lenses */}
        <div className="lg:col-span-5 space-y-6">
          {/* SVG Local Network */}
          <div className="p-5 bg-surface border border-theme-subtle rounded-xl space-y-3 shadow-theme-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-muted font-semibold flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5" />
                <span>Local Knowledge Map</span>
              </span>
              <span className="text-[11px] font-mono text-faint">Click node to inspect</span>
            </div>

            <div className="relative w-full aspect-[4/3] bg-surface-subtle rounded-lg border border-theme-subtle flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 520 300">
                {/* Connecting hairline rays */}
                {mapNodes.map((n, idx) => (
                  <line
                    key={idx}
                    x1="260"
                    y1="150"
                    x2={n.x}
                    y2={n.y}
                    stroke="var(--border-strong)"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* Central Hub Node (Active Topic) */}
                <circle cx="260" cy="150" r="32" fill="var(--text-main)" />
                <text
                  x="260"
                  y="153"
                  textAnchor="middle"
                  fill="var(--bg-app)"
                  className="font-serif text-[11px] font-medium"
                >
                  {activeTopic.length > 14 ? activeTopic.slice(0, 12) + '...' : activeTopic}
                </text>

                {/* Satellite Connected Object Nodes */}
                {mapNodes.map((n) => {
                  return (
                    <g
                      key={n.item.id}
                      onClick={() => onSelectObject(n.item)}
                      className="cursor-pointer group"
                    >
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r="14"
                        fill="var(--bg-surface)"
                        stroke="var(--border-strong)"
                        strokeWidth="1.5"
                        className="transition-transform group-hover:scale-110"
                      />
                      <circle cx={n.x} cy={n.y} r="4" fill="var(--text-muted)" />
                      <text
                        x={n.x}
                        y={n.y > 150 ? n.y + 16 : n.y - 10}
                        textAnchor="middle"
                        fill="var(--text-main)"
                        className="font-serif text-[10px] pointer-events-none select-none"
                      >
                        {n.item.title.length > 16 ? n.item.title.slice(0, 15) + '…' : n.item.title}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Related Cross-Cutting Topics */}
          {relatedTopics.length > 0 && (
            <div className="p-4 bg-surface border border-theme-subtle rounded-xl space-y-2 shadow-theme-card">
              <div className="text-xs font-mono uppercase tracking-widest text-muted font-semibold">
                Intersects with Lenses
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {relatedTopics.map(rel => (
                  <button
                    key={rel.name}
                    onClick={() => {
                      setActiveTopic(rel.name);
                      setSelectedTopic(rel.name);
                    }}
                    className="text-xs text-main hover:underline px-2.5 py-1 bg-surface-subtle border border-theme-subtle rounded cursor-pointer transition-colors"
                  >
                    {rel.name} <span className="text-faint font-mono text-[10px]">({rel.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Objects Under this Lens */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
            <div>
              <h2 className="font-serif text-2xl text-main">
                Knowledge under “{activeTopic}”
              </h2>
              <p className="text-xs text-muted">{topicItems.length} objects associated</p>
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center gap-1 text-xs">
              {(['all', 'question', 'observation', 'source', 'experiment'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2 py-0.5 rounded capitalize cursor-pointer transition-colors ${
                    typeFilter === t
                      ? 'bg-surface-subtle text-main font-semibold border border-theme-strong'
                      : 'text-muted hover:text-main'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectObject(item)}
                className="p-4 bg-surface hover:bg-surface-hover border border-theme-subtle rounded-lg shadow-theme-card transition-all cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-mono text-muted">
                  <span className="uppercase">{item.type}</span>
                  {item.provenance && (
                    <span>{item.provenance}</span>
                  )}
                </div>

                <h3 className="font-serif text-lg text-main font-medium group-hover:text-muted transition-colors leading-snug">
                  {item.title}
                </h3>

                {item.summary && (
                  <p className="text-xs text-muted line-clamp-2 font-serif">
                    {item.summary}
                  </p>
                )}

                {item.currentUnderstanding && item.type === 'question' && (
                  <p className="text-xs text-muted italic border-l border-theme-strong pl-2">
                    {item.currentUnderstanding}
                  </p>
                )}

                <div className="pt-1 flex items-center justify-between text-xs text-faint font-mono">
                  <span>{item.topics?.join(' · ')}</span>
                  <span className="group-hover:translate-x-0.5 transition-transform text-main font-medium flex items-center gap-1">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-sm text-muted font-serif italic border border-dashed border-theme-subtle rounded-lg bg-surface-subtle">
                No {typeFilter !== 'all' ? typeFilter : ''} objects associated with this topic yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
