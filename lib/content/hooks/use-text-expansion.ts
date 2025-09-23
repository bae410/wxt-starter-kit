import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTextExpansionOptions {
  text: string;
  maxLines?: number;
}

interface UseTextExpansionResult {
  isExpanded: boolean;
  needsTruncation: boolean;
  toggleExpansion: () => void;
  resetExpansion: () => void;
  textRef: React.MutableRefObject<HTMLDivElement | null>;
}

export function useTextExpansion({
  text,
  maxLines = 2,
}: UseTextExpansionOptions): UseTextExpansionResult {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textRef = useRef<HTMLDivElement | null>(null);

  const checkTruncation = useCallback(() => {
    if (!textRef.current) return;

    const element = textRef.current;
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 24;
    const elementHeight = element.scrollHeight;
    const maxHeight = lineHeight * maxLines;

    setNeedsTruncation(elementHeight > maxHeight);
  }, [maxLines]);

  const toggleExpansion = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const resetExpansion = useCallback(() => {
    setIsExpanded(false);
  }, []);

  useEffect(() => {
    resetExpansion();
  }, [text, resetExpansion]);

  useEffect(() => {
    if (textRef.current) {
      checkTruncation();
    }
  }, [text, checkTruncation]);

  return {
    isExpanded,
    needsTruncation,
    toggleExpansion,
    resetExpansion,
    textRef,
  };
}
