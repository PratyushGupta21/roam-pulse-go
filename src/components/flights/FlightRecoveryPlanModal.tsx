import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Lock, ShieldAlert, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { FlightImpactPlan } from "@/lib/flights/flight-impact.server";
import { formatTime } from "@/lib/format";

interface FlightRecoveryPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impactPlan: FlightImpactPlan | null;
  onApplyPlan: () => void;
  isApplying?: boolean;
}

export function FlightRecoveryPlanModal({
  open,
  onOpenChange,
  impactPlan,
  onApplyPlan,
  isApplying = false,
}: FlightRecoveryPlanModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "items">("overview");

  if (!open || !impactPlan) return null;

  const {
    flightNumber,
    delayMinutes,
    flightStatus,
    scheduledArrival,
    estimatedArrival,
    travelerAvailableTime,
    postFlightBufferMinutes,
    affectedAnalyses,
    highImpactCount,
    mediumImpactCount,
    protectedCount,
    recoveryPayload,
  } = impactPlan;

  const scheduledHHMM = scheduledArrival ? formatTime(scheduledArrival.slice(11, 16)) : "16:30";
  const estimatedHHMM = estimatedArrival ? formatTime(estimatedArrival.slice(11, 16)) : "18:45";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-foreground">Flight Recovery Plan</h3>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  {flightStatus === "cancelled" ? "Cancelled" : `Delayed +${delayMinutes}m`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Flight {flightNumber} delay analysis & recommended itinerary adjustments
              </p>
            </div>
          </div>
        </div>

        {/* Traveler Availability Timeline */}
        <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Availability Timeline</span>
            <span className="text-foreground">+{postFlightBufferMinutes}m Post-Flight Buffer</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-border bg-background p-2.5 space-y-0.5">
              <span className="text-[10px] text-muted-foreground">Scheduled Arrival</span>
              <p className="font-mono font-bold text-foreground">{scheduledHHMM}</p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-0.5">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Estimated Arrival</span>
              <p className="font-mono font-bold text-amber-700 dark:text-amber-300">{estimatedHHMM}</p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 space-y-0.5">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">Traveler Ready</span>
              <p className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{formatTime(travelerAvailableTime)}</p>
            </div>
          </div>
        </div>

        {/* Affected Summary Badges */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {highImpactCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2.5 py-1 font-bold text-red-600">
                <ShieldAlert className="h-3.5 w-3.5" />
                {highImpactCount} High Impact
              </span>
            ) : null}
            {mediumImpactCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2.5 py-1 font-bold text-amber-700 dark:text-amber-300">
                <Clock className="h-3.5 w-3.5" />
                {mediumImpactCount} Medium Impact
              </span>
            ) : null}
            {protectedCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-2.5 py-1 font-bold text-blue-600 dark:text-blue-400">
                <Lock className="h-3.5 w-3.5" />
                {protectedCount} Protected
              </span>
            ) : null}
          </div>

          <span className="text-muted-foreground text-[11px]">
            {affectedAnalyses.length} activities analyzed
          </span>
        </div>

        {/* Impacted Items List */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {affectedAnalyses.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-xs text-emerald-700 dark:text-emerald-300 font-medium space-y-1">
              <CheckCircle2 className="h-5 w-5 mx-auto" />
              <p>Flight delay detected, but your current itinerary remains reachable!</p>
            </div>
          ) : (
            affectedAnalyses.map((analysis) => (
              <div
                key={analysis.item.id}
                className={`rounded-xl border p-3.5 space-y-2 text-xs transition-all ${
                  analysis.recommendation === "PROTECTED"
                    ? "border-blue-500/30 bg-blue-500/5"
                    : analysis.impactLevel === "HIGH"
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    {analysis.item.is_locked ? <Lock className="h-3.5 w-3.5 text-blue-500" /> : null}
                    <span>{analysis.item.title}</span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      analysis.recommendation === "PROTECTED"
                        ? "bg-blue-500/20 text-blue-600 dark:text-blue-300"
                        : analysis.recommendation === "REPLACE"
                        ? "bg-red-500/20 text-red-600 dark:text-red-300"
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {analysis.recommendation}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Scheduled: {formatTime(analysis.item.start_time)}</span>
                  {analysis.suggestedNewStart ? (
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      Recommended: <ArrowRight className="h-3 w-3 text-primary" /> {formatTime(analysis.suggestedNewStart)}
                    </span>
                  ) : null}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                  "{analysis.reason}"
                </p>
              </div>
            ))
          )}
        </div>

        {/* Replacement Recommendation Highlight */}
        {recoveryPayload ? (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                RoamPulse AI Recommendation
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Score: {recoveryPayload.primary.score}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Replace <strong>"{recoveryPayload.affectedItemTitle}"</strong> with{" "}
              <strong className="text-foreground">"{recoveryPayload.primary.title}"</strong> ({recoveryPayload.primary.category}) starting at{" "}
              {formatTime(recoveryPayload.newStartTime)}.
            </p>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            Keep Original Itinerary
          </Button>

          <Button
            type="button"
            variant="recover"
            size="sm"
            onClick={() => {
              onApplyPlan();
              onOpenChange(false);
            }}
            disabled={isApplying || affectedAnalyses.length === 0}
            className="gap-2 font-bold shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            <span>Apply Recovery Plan</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
