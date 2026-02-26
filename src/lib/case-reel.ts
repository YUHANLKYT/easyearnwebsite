type ReelSegmentInput = {
  id: string;
  label: string;
  colorClass: string;
  chancePermille: number;
};

export type ReelEntry = {
  id: string;
  label: string;
  colorClass: string;
};

type BuildCaseReelInput = {
  segments: ReelSegmentInput[];
  count: number;
  winIndex: number;
  winningId?: string;
  minPerSegment?: number;
};

function toReelEntry(segment: ReelSegmentInput): ReelEntry {
  return {
    id: segment.id,
    label: segment.label,
    colorClass: segment.colorClass,
  };
}

function pickWeightedSegment(segments: ReelSegmentInput[]): ReelSegmentInput {
  const totalWeight = segments.reduce((sum, segment) => sum + segment.chancePermille, 0);
  let roll = Math.random() * totalWeight;

  for (const segment of segments) {
    roll -= segment.chancePermille;
    if (roll <= 0) {
      return segment;
    }
  }

  return segments[0];
}

function shuffleInPlace<T>(items: T[]): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = items[index];
    items[index] = items[swapIndex];
    items[swapIndex] = current;
  }
}

export function buildCaseReel({
  segments,
  count,
  winIndex,
  winningId,
  minPerSegment = 6,
}: BuildCaseReelInput): ReelEntry[] {
  if (segments.length === 0 || count <= 0) {
    return [];
  }

  const entries: ReelEntry[] = [];
  const guaranteedPerSegment = Math.max(1, minPerSegment);

  // Ensure each currency appears many times in the visual reel.
  for (const segment of segments) {
    for (let repeat = 0; repeat < guaranteedPerSegment; repeat += 1) {
      entries.push(toReelEntry(segment));
    }
  }

  while (entries.length < count) {
    entries.push(toReelEntry(pickWeightedSegment(segments)));
  }

  if (entries.length > count) {
    entries.length = count;
  }

  shuffleInPlace(entries);

  if (winningId && winIndex >= 0 && winIndex < entries.length) {
    const winner = segments.find((segment) => segment.id === winningId);
    if (winner) {
      entries[winIndex] = toReelEntry(winner);
    }
  }

  return entries;
}
