'use client';

import { AgentReadinessResult, AgentReadinessRecommendation, AgentReadinessCheck, AgentReadinessCategory } from '@/lib/api';
import CopyButton from './CopyButton';

interface Props {
  ar: AgentReadinessResult | null | undefined;
}

export default function AgentReadinessTab({ ar }: Props) {
  if (!ar) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-border rounded-xl bg-muted/30">
        Agent Readiness data is not available for this scan yet. Re-scan this website to generate the new Agent Readiness report.
      </div>
    );
  }

  const copyText = ar.copyAllInstructionsMarkdown || 
    ar.recommendations?.map(r => `## ${r.title}\n**Priority**: ${r.priority}\n**Issue**: ${r.issue}\n**Fix**: ${r.fix}\n`).join('\n\n') || 
    '';

  const packetJson = ar.aeo_site_readiness_packet ? JSON.stringify(ar.aeo_site_readiness_packet, null, 2) : '';

  const mediaContext = ar.categories && Object.values(ar.categories).find(c => c.id === 'media_visual_context' || c.label.toLowerCase().includes('media'));
  
  const informationalChecks = ar.informationalChecks || [];

  return (
    <div className="flex flex-col gap-8">
      {/* Score & Summary */}
      <div className="flex flex-col md:flex-row gap-6 items-start bg-card border border-border p-6 rounded-2xl">
        <div className="flex flex-col items-center justify-center shrink-0 bg-muted rounded-xl p-6 min-w-[150px]">
          <div className="text-4xl font-bold text-foreground mb-1">{ar.agentReadinessScore ?? ar.score} <span className="text-xl text-muted-foreground font-normal">/ 100</span></div>
          <div className="text-sm font-semibold text-purple-500 uppercase tracking-wider">{ar.level}</div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground mb-2">Agent Readiness Summary</h3>
          <p className="text-muted-foreground leading-relaxed">{ar.summary}</p>
        </div>
      </div>

      {/* Categories */}
      {ar.categories && Object.keys(ar.categories).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(ar.categories).map(cat => (
            <div key={cat.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-foreground">{cat.label}</h4>
                <div className="text-sm font-bold text-foreground bg-muted px-2 py-1 rounded">{cat.score} / {cat.weight || 100}</div>
              </div>
              <div className="text-xs text-muted-foreground mb-2">Passed: {cat.passed} / {cat.total || cat.checks?.length || 0}</div>
              {cat.checks && cat.checks.length > 0 && (
                <div className="flex flex-col gap-2">
                  {cat.checks.map(check => (
                    <div key={check.id} className="flex items-start gap-2 text-sm">
                      <span className={`shrink-0 w-2 h-2 mt-1.5 rounded-full ${
                        check.status === 'pass' ? 'bg-success' : 
                        check.status === 'warning' ? 'bg-warning' : 
                        check.status === 'fail' ? 'bg-destructive' : 'bg-muted-foreground'
                      }`} />
                      <span className="text-foreground">{check.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Media & Visual Context */}
      {mediaContext && mediaContext.checks?.some(c => c.status === 'warning' || c.status === 'fail') && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-warning mb-3">Media & Visual Context Warnings</h3>
          <ul className="list-disc list-inside text-foreground space-y-2 text-sm">
            {mediaContext.checks.filter(c => c.status === 'warning' || c.status === 'fail').map(check => (
              <li key={check.id}>
                <span className="font-semibold">{check.label}:</span> {check.evidence || JSON.stringify(check.details || {})}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Priority Recommendations */}
      {ar.recommendations && ar.recommendations.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <h3 className="text-xl font-bold text-foreground">Priority Recommendations</h3>
            {copyText && <CopyButton content={copyText} label="Copy All Fix Instructions" />}
          </div>
          <div className="flex flex-col gap-4">
            {ar.recommendations.map(rec => (
              <div key={rec.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start gap-4">
                  <h4 className="font-bold text-foreground text-lg">{rec.title}</h4>
                  <div className="flex gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded font-semibold uppercase ${
                      rec.priority === 'critical' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                      rec.priority === 'high' ? 'bg-warning/20 text-warning border border-warning/30' :
                      'bg-muted text-muted-foreground border border-border'
                    }`}>{rec.priority}</span>
                    <span className="text-xs px-2 py-1 rounded font-semibold uppercase bg-muted text-foreground border border-border">
                      {rec.difficulty}
                    </span>
                  </div>
                </div>
                {rec.issue && (
                  <div>
                    <span className="text-xs font-bold text-destructive uppercase">Issue:</span>
                    <p className="text-sm text-foreground mt-1">{rec.issue}</p>
                  </div>
                )}
                {rec.fix && (
                  <div>
                    <span className="text-xs font-bold text-success uppercase">Fix:</span>
                    <p className="text-sm text-foreground mt-1">{rec.fix}</p>
                  </div>
                )}
                {rec.developerTasks && rec.developerTasks.length > 0 && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Developer Tasks:</span>
                    <ul className="list-disc list-inside text-sm text-foreground mt-1 space-y-1">
                      {rec.developerTasks.map((task, i) => <li key={i}>{task}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informational Checks */}
      {informationalChecks.length > 0 && (
        <div className="flex flex-col gap-3 mt-4">
          <h3 className="text-lg font-bold text-foreground">Informational Checks</h3>
          <p className="text-xs text-muted-foreground mb-2">These items have no impact on your readiness score.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {informationalChecks.map(check => (
              <div key={check.id} className="bg-muted/30 border border-border rounded-lg p-4 text-sm flex flex-col gap-1">
                <div className="font-semibold text-foreground">{check.label}</div>
                {check.evidence && <div className="text-muted-foreground text-xs">{check.evidence}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Packet */}
      {packetJson && (
        <div className="flex flex-col gap-4 mt-8 pt-8 border-t border-border">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-foreground">AEO Site Readiness Packet</h3>
              <p className="text-sm text-muted-foreground">The generated intelligence packet representing this scan.</p>
            </div>
            <CopyButton content={packetJson} label="Copy Packet JSON" />
          </div>
          <div className="bg-muted/50 border border-border rounded-xl p-6 max-h-[400px] overflow-auto">
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">{packetJson}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
