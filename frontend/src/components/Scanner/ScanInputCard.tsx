'use client';

import { useState, type FormEvent } from 'react';
import type { ScanPhase } from '@/hooks/useScan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { normalizeUrl } from '@/lib/normalizeUrl';

interface Props {
  phase: ScanPhase;
  onScan: (payload: string | Record<string, any>) => void;
  onReset: () => void;
  defaultValue?: string;
  error?: string | null;
}

export default function ScanInputCard({ phase, onScan, onReset, defaultValue = '', error }: Props) {
  const [url, setUrl] = useState(defaultValue);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Amazon Form State
  const [showAmazonForm, setShowAmazonForm] = useState(false);
  const [amzMarketplace, setAmzMarketplace] = useState('US');
  const [amzAsin, setAmzAsin] = useState('');
  const [amzTitle, setAmzTitle] = useState('');
  const [amzBullets, setAmzBullets] = useState('');
  const [amzDesc, setAmzDesc] = useState('');
  const [amzSearchTerms, setAmzSearchTerms] = useState('');
  const [amzAplusText, setAmzAplusText] = useState('');
  const [amzSpecs, setAmzSpecs] = useState('');
  const [amzAplusType, setAmzAplusType] = useState('standard_text_modules_seo_friendly');
  const [amzFaq, setAmzFaq] = useState('');
  const [amzReviews, setAmzReviews] = useState('');
  const [amzNiche, setAmzNiche] = useState('');

  const { t } = useLanguage();
  const scanning = phase === 'scanning';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!url.trim() || scanning) return;

    let normalized = url.trim();
    try {
      normalized = normalizeUrl(normalized);
    } catch {
      setLocalError(t.errorInvalidUrl);
      return;
    }

    // Amazon Detection
    if (!showAmazonForm && normalized.match(/amazon\.(com|ca|co\.uk|de|co\.jp|com\.au|in|fr|es|it)/i)) {
      setShowAmazonForm(true);
      // Try to extract ASIN
      const asinMatch = normalized.match(/(?:dp|o|gp|-)\/(B[0-9A-Z]{9})/i);
      if (asinMatch) setAmzAsin(asinMatch[1]);
      return;
    }

    if (phase === 'complete' || phase === 'failed') {
      onReset();
    }

    if (showAmazonForm) {
      onScan({
        sourceType: 'amazon_listing',
        marketplace: amzMarketplace,
        manualListing: {
          amazonProductTitle: amzTitle,
          bulletPoints: amzBullets,
          productDescription: amzDesc,
          backendSearchTerms: amzSearchTerms,
          aPlusContentText: amzAplusText,
          productDetailsSpecs: amzSpecs,
          aPlusContentType: amzAplusType,
          faqInformation: amzFaq,
          reviewInformation: amzReviews,
          productNicheKnowledge: amzNiche,
          amazonUrl: normalized
        }
      });
    } else {
      onScan(normalized);
    }
  }

  if (showAmazonForm) {
    return (
      <div className="flex flex-col w-full max-w-2xl gap-4 bg-card border border-border rounded-2xl p-6 shadow-xl text-left">
        <h3 className="font-bold text-xl text-foreground flex items-center justify-between">
          <span>Amazon Manual Listing</span>
          <button onClick={() => setShowAmazonForm(false)} className="text-sm font-normal text-muted-foreground hover:text-foreground">Cancel</button>
        </h3>
        <p className="text-sm text-muted-foreground">Amazon limits bot access. Please paste your listing data manually for AI relevance analysis.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Amazon URL</label>
              <Input type="text" value={url} onChange={(e) => setUrl(e.target.value)} required className="bg-muted border-border" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">ASIN (optional)</label>
              <Input type="text" value={amzAsin} onChange={(e) => setAmzAsin(e.target.value)} className="bg-muted border-border" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Marketplace</label>
              <Input type="text" value={amzMarketplace} onChange={(e) => setAmzMarketplace(e.target.value)} required className="bg-muted border-border" placeholder="e.g. US" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">A+ Content Type</label>
              <select value={amzAplusType} onChange={(e) => setAmzAplusType(e.target.value)} className="w-full h-10 px-3 rounded-md bg-muted border border-border text-sm">
                <option value="standard_text_modules_seo_friendly">Standard SEO Friendly</option>
                <option value="images_only_text_embedded_seo_invisible">Images Only (Invisible SEO)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Product Title</label>
            <Input type="text" value={amzTitle} onChange={(e) => setAmzTitle(e.target.value)} required className="bg-muted border-border" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Bullet Points</label>
              <textarea value={amzBullets} onChange={(e) => setAmzBullets(e.target.value)} required className="w-full h-24 p-3 rounded-md bg-muted border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Product Description</label>
              <textarea value={amzDesc} onChange={(e) => setAmzDesc(e.target.value)} required className="w-full h-24 p-3 rounded-md bg-muted border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Product Details / Specs</label>
              <textarea value={amzSpecs} onChange={(e) => setAmzSpecs(e.target.value)} required className="w-full h-24 p-3 rounded-md bg-muted border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Backend Search Terms (opt)</label>
              <textarea value={amzSearchTerms} onChange={(e) => setAmzSearchTerms(e.target.value)} className="w-full h-24 p-3 rounded-md bg-muted border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">A+ Content Text (opt)</label>
              <textarea value={amzAplusText} onChange={(e) => setAmzAplusText(e.target.value)} className="w-full h-24 p-3 rounded-md bg-muted border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">FAQ / Q&A (opt)</label>
              <textarea value={amzFaq} onChange={(e) => setAmzFaq(e.target.value)} className="w-full h-24 p-3 rounded-md bg-muted border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Review Information (opt)</label>
              <textarea value={amzReviews} onChange={(e) => setAmzReviews(e.target.value)} className="w-full h-24 p-3 rounded-md bg-muted border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Product Niche Knowledge (opt)</label>
              <textarea value={amzNiche} onChange={(e) => setAmzNiche(e.target.value)} className="w-full h-24 p-3 rounded-md bg-muted border border-border text-sm" />
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={scanning || !url.trim()}
            className="h-14 mt-4 w-full rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {scanning ? (
              <>
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="hidden sm:inline">...</span>
              </>
            ) : (
              "Submit Manual Amazon Listing"
            )}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-2xl gap-2">
      <form onSubmit={handleSubmit} className="flex w-full gap-3">
        <Input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setLocalError(null);
          }}
          placeholder={t.inputPlaceholder}
          disabled={scanning}
          required
          className="flex-1 h-14 bg-card border-border text-foreground text-base rounded-xl placeholder:text-muted-foreground focus-visible:ring-purple-500"
        />
        <Button
          type="submit"
          disabled={scanning || !url.trim()}
          className="h-14 px-8 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {scanning ? (
            <>
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span className="hidden sm:inline">...</span>
            </>
          ) : (
            t.submitButton
          )}
        </Button>
      </form>
      {/* Helper Text / Local Error */}
      {localError ? (
        <p className="text-sm text-red-400 pl-1">{localError}</p>
      ) : (
        <p className="text-sm text-gray-500 pl-1">{t.inputHelper}</p>
      )}
      {scanning && (
        <p className="text-sm text-gray-400 pl-1 mt-1 text-center sm:text-left">
          Scanning: <span className="text-purple-500">{normalizeUrl(url).substring(0, 50)}</span>
        </p>
      )}
    </div>
  );
}
