'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ScanPollResult } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import CopyButton from './CopyButton';
import AgentReadinessTab from './AgentReadinessTab';

function renderRecommendation(rec: unknown): string {
  if (typeof rec === 'string') return rec;
  if (rec && typeof rec === 'object' && 'item' in rec) return String((rec as any).item);
  return JSON.stringify(rec);
}

interface Props {
  result: ScanPollResult;
  rightSidebar?: React.ReactNode;
}

export default function OutputTabs({ result, rightSidebar }: Props) {
  const { t } = useLanguage();
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const aeo = result.aeoContent;

  if (!aeo) return null;

  const fontClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg'
  }[fontSize];

  const btnClass = "px-2 py-1 bg-muted hover:bg-muted-foreground/20 rounded text-xs text-muted-foreground font-semibold transition-colors flex items-center justify-center min-w-[28px]";

  // Generate Copy Texts
  const overviewSummary = [
    aeo.businessName,
    aeo.tagline,
    aeo.about,
    aeo.features?.length ? `Features:\n- ${aeo.features.join('\n- ')}` : '',
    aeo.productsServices?.length ? `Products/Services:\n- ${aeo.productsServices.join('\n- ')}` : '',
    aeo.contact ? `Contact:\nPhone: ${aeo.contact.phone || 'N/A'}\nEmail: ${aeo.contact.email || 'N/A'}\nAddress: ${aeo.contact.address || 'N/A'}` : ''
  ].filter(Boolean).join('\n\n');

  const recsText = aeo.recommendations?.map(rawRec => `- ${renderRecommendation(rawRec)}`).join('\n') || '';

  const isAmazon = result.scanType === 'amazon_ai_relevance';
  const amazon = result.amazonAiRelevance;

  return (
    <div className="w-full flex flex-col">
      <Tabs defaultValue="overview" className="w-full flex flex-col gap-6">
        
        {/* Header Strip with Tabs and Font Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card border border-border p-4 rounded-2xl shadow-sm gap-4">
          <TabsList className="flex flex-wrap h-auto bg-transparent border-0 rounded-none p-0 gap-2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">{t.tabOverview}</TabsTrigger>
            
            {isAmazon ? (
              <>
                <TabsTrigger value="amazon-relevance" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">Amazon AI Relevance</TabsTrigger>
                <TabsTrigger value="categories" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">Category Scores</TabsTrigger>
                <TabsTrigger value="amazon-recommendations" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">Recommendations</TabsTrigger>
                <TabsTrigger value="amazon-fix" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">Copy Fix Instructions</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="llmstxt" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">{t.tabLlmsTxt}</TabsTrigger>
                <TabsTrigger value="faq" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">{t.tabFaq}</TabsTrigger>
                <TabsTrigger value="agent-readiness" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">Agent Readiness</TabsTrigger>
                <TabsTrigger value="recommendations" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">{t.tabRecommendations}</TabsTrigger>
                <TabsTrigger value="embed" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">{t.tabEmbed}</TabsTrigger>
              </>
            )}
          </TabsList>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mr-1">Size</span>
            <button onClick={() => setFontSize('sm')} className={`${btnClass} ${fontSize === 'sm' ? 'bg-muted-foreground/30 text-foreground' : ''}`}>A-</button>
            <button onClick={() => setFontSize('base')} className={`${btnClass} ${fontSize === 'base' ? 'bg-muted-foreground/30 text-foreground' : ''}`}>A</button>
            <button onClick={() => setFontSize('lg')} className={`${btnClass} ${fontSize === 'lg' ? 'bg-muted-foreground/30 text-foreground' : ''}`}>A+</button>
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
          
          {/* Main Left Content Area */}
          <div className={`min-w-0 w-full bg-card border border-border rounded-2xl shadow-xl shadow-black/50 p-6 md:p-8 ${fontClass}`}>
            
            {/* Website Tabs Content */}
            <TabsContent value="overview" className="mt-0 space-y-8 outline-none">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <h2 className="text-3xl font-bold text-foreground mb-2 break-words whitespace-normal">{aeo.businessName || 'Unnamed Business'}</h2>
                  {aeo.tagline && <p className="text-purple-500 font-semibold break-words whitespace-normal">{aeo.tagline}</p>}
                </div>
                <CopyButton content={overviewSummary} />
              </div>
              
              {aeo.about && (
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">About</h3>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words whitespace-normal">{aeo.about}</p>
                </div>
              )}

              {aeo.productsServices && aeo.productsServices.length > 0 && (
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Products & Services</h3>
                  <ul className="list-disc list-inside text-foreground space-y-2 leading-relaxed ml-2 break-words whitespace-normal">
                    {aeo.productsServices.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aeo.features && aeo.features.length > 0 && (
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Key Features</h3>
                  <ul className="list-disc list-inside text-foreground space-y-2 leading-relaxed ml-2 break-words whitespace-normal">
                    {aeo.features.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aeo.contact && (aeo.contact.phone || aeo.contact.email || aeo.contact.address) && (
                <div className="pt-6 border-t border-border min-w-0">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Contact Info</h3>
                  <div className="flex flex-col gap-3 text-foreground break-words whitespace-normal">
                    {aeo.contact.phone && <div className="flex gap-4"><span className="text-muted-foreground w-20 shrink-0">Phone:</span> <span>{aeo.contact.phone}</span></div>}
                    {aeo.contact.email && <div className="flex gap-4"><span className="text-muted-foreground w-20 shrink-0">Email:</span> <span>{aeo.contact.email}</span></div>}
                    {aeo.contact.address && <div className="flex gap-4"><span className="text-muted-foreground w-20 shrink-0">Address:</span> <span>{aeo.contact.address}</span></div>}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="llmstxt" className="mt-0 outline-none flex flex-col gap-4 min-w-0">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-foreground">llms.txt Payload</h3>
                <CopyButton content={aeo.llmsTxt} />
              </div>
              <div className="bg-muted/50 border border-border rounded-xl p-6 max-h-[600px] overflow-auto min-w-0">
                <pre className="font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">{aeo.llmsTxt}</pre>
              </div>
            </TabsContent>

            <TabsContent value="faq" className="mt-0 outline-none flex flex-col gap-4 min-w-0">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-foreground">FAQ JSON-LD Schema</h3>
                <CopyButton content={aeo.faqJsonLd} />
              </div>
              <div className="bg-muted/50 border border-border rounded-xl p-6 max-h-[600px] overflow-auto min-w-0">
                <pre className="font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">{aeo.faqJsonLd}</pre>
              </div>
            </TabsContent>

            <TabsContent value="agent-readiness" className="mt-0 outline-none min-w-0">
              <AgentReadinessTab ar={aeo.agentReadiness} />
            </TabsContent>

            <TabsContent value="recommendations" className="mt-0 outline-none flex flex-col gap-6 min-w-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-xl text-foreground">Recommendations</h3>
                {aeo.recommendations && aeo.recommendations.length > 0 && (
                  <CopyButton content={recsText} />
                )}
              </div>
              
              {aeo.recommendations && aeo.recommendations.length > 0 ? (
                <ul className="flex flex-col gap-4 break-words whitespace-normal">
                  {aeo.recommendations.map((rawRec, i) => {
                    const rec = renderRecommendation(rawRec);
                    return (
                      <li key={i} className="flex items-start gap-4 text-foreground bg-muted p-5 rounded-xl leading-relaxed">
                        <span className="text-success shrink-0 font-bold text-xl mt-[-2px]">→</span>
                        <span>{rec}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-muted-foreground">No recommendations available.</p>
              )}
            </TabsContent>

            <TabsContent value="embed" className="mt-0 outline-none flex flex-col gap-10 min-w-0">
              {aeo.llmsTxtLinkTag && (
                <div className="flex flex-col gap-4 min-w-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">1. Link Tag</h3>
                      <p className="text-muted-foreground mt-1">Paste this inside your site's <code className="text-purple-500">&lt;head&gt;</code> to help AI discover your llms.txt.</p>
                    </div>
                    <CopyButton content={aeo.llmsTxtLinkTag} />
                  </div>
                  <div className="bg-muted/50 border border-border rounded-xl p-6 overflow-auto min-w-0">
                    <pre className="font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">{aeo.llmsTxtLinkTag}</pre>
                  </div>
                </div>
              )}
              
              {aeo.addressHtml && (
                <div className="flex flex-col gap-4 min-w-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">2. Semantic Address</h3>
                      <p className="text-muted-foreground mt-1">Paste this in your footer or contact page for local AI search.</p>
                    </div>
                    <CopyButton content={aeo.addressHtml} />
                  </div>
                  <div className="bg-muted/50 border border-border rounded-xl p-6 overflow-auto min-w-0">
                    <pre className="font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">{aeo.addressHtml}</pre>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Amazon Tabs Content */}
            {isAmazon && amazon && (
              <>
                <TabsContent value="amazon-relevance" className="mt-0 outline-none space-y-6 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xl text-foreground">Amazon AI Relevance</h3>
                  </div>
                  <div className="bg-muted/50 border border-border rounded-xl p-6 break-words whitespace-normal">
                    <div className="flex flex-wrap gap-4 mb-4">
                      {amazon.level && <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-semibold">Level: {amazon.level}</span>}
                      {amazon.source?.marketplace && <span className="px-3 py-1 bg-muted border border-border rounded-full text-sm font-semibold">Marketplace: {amazon.source.marketplace}</span>}
                      {amazon.source?.asin && <span className="px-3 py-1 bg-muted border border-border rounded-full text-sm font-semibold">ASIN: {amazon.source.asin}</span>}
                      {amazon.usageCost && <span className="px-3 py-1 bg-muted border border-border rounded-full text-sm font-semibold">Cost: ${amazon.usageCost.toFixed(3)}</span>}
                    </div>
                    <p className="text-foreground leading-relaxed">{amazon.summary}</p>
                    {amazon.source?.canonicalPhraseEnglish && (
                      <p className="text-muted-foreground italic mt-4 text-sm break-words whitespace-normal">
                        Analyzed against phrase: {amazon.source.canonicalPhraseEnglish}
                      </p>
                    )}
                  </div>

                  <h3 className="font-bold text-xl text-foreground mt-8">Major Scores Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(amazon.scores).map(([key, val]) => (
                      <div key={key} className="bg-muted/30 border border-border rounded-xl p-4 flex justify-between items-center break-words whitespace-normal">
                        <span className="text-foreground font-semibold capitalize break-words">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-success font-bold shrink-0 ml-2">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="categories" className="mt-0 outline-none space-y-6 min-w-0">
                  <h3 className="font-bold text-xl text-foreground">Category Scores</h3>
                  {amazon.categories.map((cat, i) => (
                    <div key={i} className="bg-muted/30 border border-border rounded-xl p-6 mb-4 break-words whitespace-normal">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-lg text-foreground break-words">{cat.name || cat.label || 'Category'}</h4>
                        <span className="text-success font-bold shrink-0 ml-2">{cat.score || 0} / {cat.maxScore || 100}</span>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">{cat.details || JSON.stringify(cat)}</p>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="amazon-recommendations" className="mt-0 outline-none space-y-6 min-w-0">
                  <h3 className="font-bold text-xl text-foreground">Recommendations</h3>
                  <ul className="flex flex-col gap-4 break-words whitespace-normal">
                    {amazon.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-4 text-foreground bg-muted p-5 rounded-xl leading-relaxed">
                        <span className="text-warning shrink-0 font-bold text-xl mt-[-2px]">→</span>
                        <span>{renderRecommendation(rec)}</span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>

                <TabsContent value="amazon-fix" className="mt-0 outline-none space-y-6 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xl text-foreground">Copy Fix Instructions</h3>
                    <CopyButton content={amazon.copyAllInstructionsMarkdown || ''} />
                  </div>
                  <div className="bg-muted/50 border border-border rounded-xl p-6 max-h-[600px] overflow-auto min-w-0">
                    <pre className="font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">{amazon.copyAllInstructionsMarkdown}</pre>
                  </div>
                </TabsContent>
              </>
            )}
          </div>
          
          {/* Right Sidebar Wrap */}
          {rightSidebar && (
            <div className="w-full max-w-[320px] flex flex-col gap-6 shrink-0">
              {rightSidebar}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
