'use client';

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
  const aeo = result.aeoContent;

  if (!aeo) return null;

  return (
    <div className="w-full">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto bg-[#111827] border border-[#374151] rounded-xl p-1 gap-1">
          <TabsTrigger value="overview" className="flex-1 whitespace-nowrap text-sm">{t.tabOverview}</TabsTrigger>
          <TabsTrigger value="llmstxt" className="flex-1 whitespace-nowrap text-sm">{t.tabLlmsTxt}</TabsTrigger>
          <TabsTrigger value="faq" className="flex-1 whitespace-nowrap text-sm">{t.tabFaq}</TabsTrigger>
          <TabsTrigger value="recommendations" className="flex-1 whitespace-nowrap text-sm">{t.tabRecommendations}</TabsTrigger>
          <TabsTrigger value="embed" className="flex-1 whitespace-nowrap text-sm">{t.tabEmbed}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{aeo.businessName || 'Unnamed Business'}</h2>
              {aeo.tagline && <p className="text-[#a855f7] font-medium">{aeo.tagline}</p>}
            </div>
            
            {aeo.about && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">About</h3>
                <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">{aeo.about}</p>
              </div>
            )}

            {aeo.productsServices && aeo.productsServices.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Products & Services</h3>
                <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                  {aeo.productsServices.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {aeo.features && aeo.features.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Key Features</h3>
                <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                  {aeo.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {aeo.contact && (aeo.contact.phone || aeo.contact.email || aeo.contact.address) && (
              <div className="pt-4 border-t border-[#374151]">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact Info</h3>
                <div className="flex flex-col gap-1 text-sm text-gray-300">
                  {aeo.contact.phone && <div><span className="text-gray-500 w-16 inline-block">Phone:</span> {aeo.contact.phone}</div>}
                  {aeo.contact.email && <div><span className="text-gray-500 w-16 inline-block">Email:</span> {aeo.contact.email}</div>}
                  {aeo.contact.address && <div><span className="text-gray-500 w-16 inline-block">Address:</span> {aeo.contact.address}</div>}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="llmstxt" className="mt-4">
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-300">llms.txt</h3>
              <CopyButton content={aeo.llmsTxt} />
            </div>
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-4 max-h-[500px] overflow-auto">
              <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap break-words">{aeo.llmsTxt}</pre>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-300">FAQ JSON-LD</h3>
              <CopyButton content={aeo.faqJsonLd} />
            </div>
            <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-4 max-h-[500px] overflow-auto">
              <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap break-words">{aeo.faqJsonLd}</pre>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-4">
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-6">
            <h3 className="font-semibold text-gray-300 mb-4">{t.recommendationsTitle}</h3>
            {aeo.recommendations && aeo.recommendations.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {aeo.recommendations.map((rawRec, i) => {
                  const rec = renderRecommendation(rawRec);
                  return (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300 bg-[#1f2937] p-4 rounded-lg">
                      <span className="text-[#00ff88] shrink-0 font-bold">→</span>
                      <span className="leading-relaxed">{rec}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No recommendations available.</p>
            )}
            
            {aeo.searchKeywords && aeo.searchKeywords.length > 0 && (
              <div className="mt-8">
                <h4 className="font-semibold text-sm text-gray-400 mb-3">Target Search Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {aeo.searchKeywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1 bg-[#374151] text-gray-300 text-xs rounded-full">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="embed" className="mt-4">
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-6 flex flex-col gap-8">
            {aeo.llmsTxtLinkTag && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm text-gray-300">1. Link Tag (Paste inside &lt;head&gt;)</h3>
                  <CopyButton content={aeo.llmsTxtLinkTag} />
                </div>
                <p className="text-xs text-gray-500">Helps AI crawlers automatically discover your llms.txt file.</p>
                <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-4 overflow-auto">
                  <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap break-words">{aeo.llmsTxtLinkTag}</pre>
                </div>
              </div>
            )}
            
            {aeo.addressHtml && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm text-gray-300">2. Semantic Address (Paste in footer)</h3>
                  <CopyButton content={aeo.addressHtml} />
                </div>
                <p className="text-xs text-gray-500">Provides structured location data for local AI search queries.</p>
                <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-4 overflow-auto">
                  <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap break-words">{aeo.addressHtml}</pre>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
