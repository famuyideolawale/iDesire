export const STANDARD_WORD_ALLOWANCE = 8;
export function countPersonalisationWords(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}
export type GiftPersonalisation = {
  method: 'none' | 'text' | 'logo' | 'text-and-logo';
  wording: string;
  wordCount: number;
  extraWords: number;
  productColour: string;
  printColour: string;
  placement: string;
  artworkNotes: string;
  additionalNotes: string;
  extraWordingQuoteAccepted: boolean;
};
