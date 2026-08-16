import { ACTIVITY_CATALOG } from "./activity-catalog";
import type { RecoveryAlternative, RecoveryPayload } from "./domain";
import { addMinutes, minutesOf } from "./format";

export interface EngineItem {
  id: string;
  title: string;
  day_date: string;
  start_time: string;
  end_time: string;
  category: string;
  estimated_cost: number;
  indoor_outdoor: string;
  is_locked: boolean;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DisruptionContext {
  type: "flight_delay" | "weather" | "transport" | "schedule";
  minutesLost: number;
  fromTime: string;
  interests: string[];
  currency: string;
  maxExtraSpend: number;
  recoveryMode: "manual" | "assisted" | "autonomous";
  anchorLat: number | null;
  anchorLon: number | null;
  rainProbability?: number;
}

/** Step 1-4: which items can no longer fit, honouring locked items. */
export function findAffectedItems(items: EngineItem[], ctx: DisruptionContext) {
  const cutoff = minutesOf(ctx.fromTime);
  return items.filter((item) => {
    if (item.is_locked) return false;
    if (item.status === "completed" || item.status === "replaced") return false;
    if (ctx.type === "weather") {
      return item.indoor_outdoor === "outdoor" && minutesOf(item.start_time) >= cutoff;
    }
    return minutesOf(item.start_time) < cutoff && minutesOf(item.end_time) > cutoff - ctx.minutesLost;
  });
}

/** Steps 5-9: search, filter, score alternatives. */
export function scoreAlternatives(
  affected: EngineItem,
  ctx: DisruptionContext,
  startTime: string,
): RecoveryAlternative[] {
  return ACTIVITY_CATALOG.map((activity) => {
    const interestOverlap = activity.interests.filter((i) => ctx.interests.includes(i)).length;
    const budgetFit = activity.estimatedCost <= ctx.maxExtraSpend + affected.estimated_cost ? 1 : 0;
    const indoorBonus = ctx.type === "weather" || ctx.type === "flight_delay" ? (activity.indoorOutdoor === "indoor" ? 1 : 0) : 0.5;
    const proximity = Math.max(0, 1 - activity.distanceKm / 8);
    const score =
      interestOverlap * 0.28 + budgetFit * 0.22 + indoorBonus * 0.25 + proximity * 0.15 + (activity.rating / 5) * 0.1;

    const reasons: string[] = [];
    reasons.push(`Fits your new schedule from ${startTime}`);
    if (activity.indoorOutdoor === "indoor") reasons.push("Indoor — unaffected by weather");
    if (interestOverlap > 0) reasons.push(`Matches your ${activity.interests.filter((i) => ctx.interests.includes(i))[0]} interest`);
    reasons.push(`${Math.round(activity.distanceKm * 4)} minutes away (${activity.distanceKm} km)`);
    if (budgetFit) reasons.push("Within your budget limit");

    return {
      id: activity.id,
      title: activity.title,
      category: activity.category,
      description: activity.description,
      distanceKm: activity.distanceKm,
      durationMinutes: activity.durationMinutes,
      estimatedCost: activity.estimatedCost,
      indoorOutdoor: activity.indoorOutdoor,
      weatherSuitability: activity.indoorOutdoor === "indoor" ? "any" : "clear_only",
      rating: activity.rating,
      reasons,
      score: Number(score.toFixed(3)),
      sponsored: Boolean(activity.sponsored),
      latitude: ctx.anchorLat === null ? null : Number((ctx.anchorLat + activity.latOffset).toFixed(5)),
      longitude: ctx.anchorLon === null ? null : Number((ctx.anchorLon + activity.lonOffset).toFixed(5)),
      bookingUrl: activity.bookingUrl ?? null,
      startTime,
      endTime: addMinutes(startTime, activity.durationMinutes),
    } satisfies RecoveryAlternative;
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/** Step 10-11: build the recommendation payload. */
export function buildRecovery(
  items: EngineItem[],
  ctx: DisruptionContext,
): { affected: EngineItem[]; payload: RecoveryPayload | null } {
  const affected = findAffectedItems(items, ctx);
  if (affected.length === 0) return { affected, payload: null };

  const target = affected[0]!;
  const newStart = ctx.type === "weather" ? target.start_time : addMinutes(ctx.fromTime, 60);
  const alternatives = scoreAlternatives(target, ctx, newStart);
  const primary = alternatives[0]!;
  const costDelta = primary.estimatedCost - target.estimated_cost;

  const requiresApproval =
    ctx.recoveryMode === "manual" ||
    (ctx.recoveryMode === "assisted" && costDelta > ctx.maxExtraSpend * 0.25) ||
    (ctx.recoveryMode === "autonomous" && costDelta > ctx.maxExtraSpend);

  return {
    affected,
    payload: {
      affectedItemId: target.id,
      affectedItemTitle: target.title,
      affectedItemDate: target.day_date,
      affectedItemStartTime: target.start_time,
      affectedItemEndTime: target.end_time,
      affectedItemCategory: target.category || "activity",
      affectedItemCost: target.estimated_cost || 0,
      affectedItemIndoorOutdoor: target.indoor_outdoor || "outdoor",
      disruptionType: ctx.type,
      disruptionMinutes: ctx.minutesLost,
      disruptionFromTime: ctx.fromTime,
      rainProbability: ctx.rainProbability,
      replacementDate: target.day_date,
      reason:
        ctx.type === "weather"
          ? `Heavy rain expected (${ctx.rainProbability ?? 80}% probability) during your outdoor activity.`
          : `Your arrival moved ${Math.round(ctx.minutesLost / 60)}h ${ctx.minutesLost % 60}m later, so "${target.title}" no longer fits.`,
      newStartTime: newStart,
      primary,
      alternatives,
      costDelta,
      requiresApproval,
    },
  };
}
