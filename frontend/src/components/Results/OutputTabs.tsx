'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { ScanPollResult } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import CopyButton from './CopyButton';
import ScoreBreakdown from './ScoreBreakdown';

interface Props {
  result: ScanPollResult;
}

export default function OutputTabs({ result }: Props) {
  const { t } = useLanguage();
  const aeo = result.aeoContent;

  if (!aeo) return null;

  return (
    <div className="w-full max-w-4xl mt-8">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-5 bg-[#111827] border border-[#374151]">
          <TabsTrigger value="overview">{t.tabOverview}</TabsTrigger>
          <TabsTrigger value="llmstxt">{t.tabLlmsTxt}</TabsTrigger>
          <TabsTrigger value="faq">{t.tabFaq}</TabsTrigger>
          <TabsTrigger value="recommendations">{t.tabRecommendations}</TabsTrigger>
          <TabsTrigger value="embed">{t.tabEmbed}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-6">
            <ScoreBreakdown result={result} />
          </div>
        </TabsContent>

        <TabsContent value="llmstxt" className="mt-4">
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-300">llms.txt</h3>
              <CopyButton content={aeo.llmsTxt} />
            </div>
            <Textarea 
              readOnly 
              value={aeo.llmsTxt} 
              className="font-mono text-sm h-[400px] bg-[#1f2937] border-[#374151] text-gray-300 focus-visible:ring-0"
            />
          </div>
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-300">FAQ JSON-LD</h3>
              <CopyButton content={aeo.faqJsonLd} />
            </div>
            <Textarea 
              readOnly 
              value={aeo.faqJsonLd} 
              className="font-mono text-sm h-[400px] bg-[#1f2937] border-[#374151] text-gray-300 focus-visible:ring-0"
            />
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-4">
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-6">
            <h3 className="font-semibold text-gray-300 mb-4">{t.recommendationsTitle}</h3>
            {aeo.recommendations && aeo.recommendations.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {aeo.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300 bg-[#1f2937] p-4 rounded-lg">
                    <span className="text-[#00ff88] shrink-0 font-bold">→</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No recommendations available.</p>
            )}
            
            {aeo.searchKeywords && aeo.searchKeywords.length > 0 && (
              <div className="mt-6">
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
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-6 flex flex-col gap-6">
            {aeo.llmsTxtLinkTag && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm text-gray-300">llms.txt Link Tag (Head)</h3>
                  <CopyButton content={aeo.llmsTxtLinkTag} />
                </div>
                <Textarea 
                  readOnly 
                  value={aeo.llmsTxtLinkTag} 
                  className="font-mono text-sm h-[80px] bg-[#1f2937] border-[#374151] text-gray-300 focus-visible:ring-0"
                />
              </div>
            )}
            
            {aeo.addressHtml && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm text-gray-300">Contact / Address HTML (Footer)</h3>
                  <CopyButton content={aeo.addressHtml} />
                </div>
                <Textarea 
                  readOnly 
                  value={aeo.addressHtml} 
                  className="font-mono text-sm h-[120px] bg-[#1f2937] border-[#374151] text-gray-300 focus-visible:ring-0"
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
