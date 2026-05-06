'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ScanPollResult } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import CopyButton from './CopyButton';

function renderRecommendation(rec: unknown): string {
  if (typeof rec === 'string') return rec;
  if (rec && typeof rec === 'object' && 'item' in rec) return String((rec as any).item);
  return JSON.stringify(rec);
}

interface Props {
  result: ScanPollResult;
}

export default function OutputTabs({ result }: Props) {
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

  return (
    <div className="w-full flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/50">
      <Tabs defaultValue="overview" className="w-full">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border p-4 gap-4 bg-muted/30">
          <TabsList className="flex flex-wrap h-auto bg-transparent border-0 rounded-none p-0 gap-2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">{t.tabOverview}</TabsTrigger>
            <TabsTrigger value="llmstxt" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">{t.tabLlmsTxt}</TabsTrigger>
            <TabsTrigger value="faq" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">{t.tabFaq}</TabsTrigger>
            <TabsTrigger value="recommendations" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">{t.tabRecommendations}</TabsTrigger>
            <TabsTrigger value="embed" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">{t.tabEmbed}</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mr-1">Size</span>
            <button onClick={() => setFontSize('sm')} className={`${btnClass} ${fontSize === 'sm' ? 'bg-muted-foreground/30 text-foreground' : ''}`}>A-</button>
            <button onClick={() => setFontSize('base')} className={`${btnClass} ${fontSize === 'base' ? 'bg-muted-foreground/30 text-foreground' : ''}`}>A</button>
            <button onClick={() => setFontSize('lg')} className={`${btnClass} ${fontSize === 'lg' ? 'bg-muted-foreground/30 text-foreground' : ''}`}>A+</button>
          </div>
        </div>

        {/* Content Body */}
        <div className={`p-6 md:p-8 ${fontClass}`}>
          <TabsContent value="overview" className="mt-0 space-y-8 outline-none">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">{aeo.businessName || 'Unnamed Business'}</h2>
                {aeo.tagline && <p className="text-purple-500 font-semibold">{aeo.tagline}</p>}
              </div>
              <CopyButton content={overviewSummary} />
            </div>
            
            {aeo.about && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">About</h3>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{aeo.about}</p>
              </div>
            )}

            {aeo.productsServices && aeo.productsServices.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Products & Services</h3>
                <ul className="list-disc list-inside text-foreground space-y-2 leading-relaxed ml-2">
                  {aeo.productsServices.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {aeo.features && aeo.features.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Key Features</h3>
                <ul className="list-disc list-inside text-foreground space-y-2 leading-relaxed ml-2">
                  {aeo.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {aeo.contact && (aeo.contact.phone || aeo.contact.email || aeo.contact.address) && (
              <div className="pt-6 border-t border-border">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Contact Info</h3>
                <div className="flex flex-col gap-3 text-foreground">
                  {aeo.contact.phone && <div className="flex gap-4"><span className="text-muted-foreground w-20 shrink-0">Phone:</span> <span>{aeo.contact.phone}</span></div>}
                  {aeo.contact.email && <div className="flex gap-4"><span className="text-muted-foreground w-20 shrink-0">Email:</span> <span>{aeo.contact.email}</span></div>}
                  {aeo.contact.address && <div className="flex gap-4"><span className="text-muted-foreground w-20 shrink-0">Address:</span> <span>{aeo.contact.address}</span></div>}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="llmstxt" className="mt-0 outline-none flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-foreground">llms.txt Payload</h3>
              <CopyButton content={aeo.llmsTxt} />
            </div>
            <div className="bg-muted/50 border border-border rounded-xl p-6 max-h-[600px] overflow-auto">
              <pre className="font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">{aeo.llmsTxt}</pre>
            </div>
          </TabsContent>

          <TabsContent value="faq" className="mt-0 outline-none flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-foreground">FAQ JSON-LD Schema</h3>
              <CopyButton content={aeo.faqJsonLd} />
            </div>
            <div className="bg-muted/50 border border-border rounded-xl p-6 max-h-[600px] overflow-auto">
              <pre className="font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">{aeo.faqJsonLd}</pre>
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-0 outline-none flex flex-col gap-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-xl text-foreground">{t.recommendationsTitle}</h3>
              {aeo.recommendations && aeo.recommendations.length > 0 && (
                <CopyButton content={recsText} />
              )}
            </div>
            
            {aeo.recommendations && aeo.recommendations.length > 0 ? (
              <ul className="flex flex-col gap-4">
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
            
            {aeo.searchKeywords && aeo.searchKeywords.length > 0 && (
              <div className="mt-8 pt-8 border-t border-border">
                <h4 className="font-bold text-foreground mb-4">Target Search Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {aeo.searchKeywords.map((kw, i) => (
                    <span key={i} className="px-4 py-2 bg-muted text-foreground rounded-full shadow-sm border border-border">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="embed" className="mt-0 outline-none flex flex-col gap-10">
            {aeo.llmsTxtLinkTag && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">1. Link Tag</h3>
                    <p className="text-muted-foreground mt-1">Paste this inside your site's <code className="text-purple-500">&lt;head&gt;</code> to help AI discover your llms.txt.</p>
                  </div>
                  <CopyButton content={aeo.llmsTxtLinkTag} />
                </div>
                <div className="bg-muted/50 border border-border rounded-xl p-6 overflow-auto">
                  <pre className="font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">{aeo.llmsTxtLinkTag}</pre>
                </div>
              </div>
            )}
            
            {aeo.addressHtml && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">2. Semantic Address</h3>
                    <p className="text-muted-foreground mt-1">Paste this in your footer or contact page for local AI search.</p>
                  </div>
                  <CopyButton content={aeo.addressHtml} />
                </div>
                <div className="bg-muted/50 border border-border rounded-xl p-6 overflow-auto">
                  <pre className="font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">{aeo.addressHtml}</pre>
                </div>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
