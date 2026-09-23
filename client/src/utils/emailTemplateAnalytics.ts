// Calculate text diff metrics
export function calculateTextDiff(original: string, final: string) {
  const originalWords = original.split(/\s+/);
  const finalWords = final.split(/\s+/);

  const charactersChanged = Math.abs(original.length - final.length);
  const wordsChanged = Math.abs(originalWords.length - finalWords.length);

  // Count actual edits (simplified - could use Levenshtein distance)
  let editCount = 0;
  for (let i = 0; i < Math.max(originalWords.length, finalWords.length); i++) {
    if (originalWords[i] !== finalWords[i]) editCount++;
  }

  return {
    charactersChanged,
    wordsChanged,
    editCount,
    editPercentage:
      originalWords.length > 0 ? (editCount / originalWords.length) * 100 : 0,
  };
}

// Calculate effectiveness score
export function calculateEffectivenessScore(metrics: {
  prospectOpened: boolean;
  prospectResponded: boolean;
  responseTimeHours?: number;
  meetingScheduled: boolean;
  meetingCompleted: boolean;
  meetingQualityRating?: number;
  dealClosed?: boolean;
}) {
  let score = 0;

  // Email opened (15 points)
  if (metrics.prospectOpened) score += 15;

  // Prospect responded (25 points)
  if (metrics.prospectResponded) score += 25;

  // Fast response bonus (<24h = 10 points, <48h = 5 points)
  if (metrics.responseTimeHours) {
    if (metrics.responseTimeHours < 24) score += 10;
    else if (metrics.responseTimeHours < 48) score += 5;
  }

  // Meeting scheduled (20 points)
  if (metrics.meetingScheduled) score += 20;

  // Meeting completed (20 points)
  if (metrics.meetingCompleted) score += 20;

  // Quality rating (0-10 points based on 1-5 stars)
  if (metrics.meetingQualityRating) {
    score += metrics.meetingQualityRating * 2;
  }

  // Deal closed bonus (10 points)
  if (metrics.dealClosed) score += 10;

  return Math.min(score, 100); // Cap at 100
}

// Determine bounty range category
export function getBountyRange(amount: number): "low" | "medium" | "high" {
  if (amount < 1000) return "low";
  if (amount < 5000) return "medium";
  return "high";
}
