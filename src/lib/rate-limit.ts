import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type RateLimitAction =
  | "customer_request_submit"
  | "request_item_mutation"
  | "admin_quote_pdf_download"
  | "admin_users_csv_export";

type RateLimitPolicy = {
  action: RateLimitAction;
  limit: number;
  windowSeconds: number;
  minIntervalSeconds?: number;
  burstMessage: string;
  limitMessage?: string;
};

type RateLimitScope = {
  userId: string;
};

type RateLimitAssertionInput = RateLimitScope & {
  policy: RateLimitPolicy;
};

type RateLimitEventInput = RateLimitScope & {
  action: RateLimitAction;
  metadata?: Json;
};

type RateLimitAuditInput = RateLimitEventInput & {
  reason: "min_interval" | "window_limit";
};

type RateLimitEventRow = {
  created_at: string;
};

const RATE_LIMIT_ENTITY_TYPE = "rate_limit";
export const RATE_LIMIT_RETENTION_DAYS = 30;

export const RATE_LIMIT_POLICIES = {
  adminQuotePdfDownload: {
    action: "admin_quote_pdf_download",
    burstMessage:
      "Çok fazla PDF indirme denemesi yapıldı. Lütfen biraz sonra tekrar deneyin.",
    limit: 20,
    windowSeconds: 60,
  },
  adminUsersCsvExport: {
    action: "admin_users_csv_export",
    burstMessage: "CSV dışa aktarım limiti aşıldı. Lütfen daha sonra tekrar deneyin.",
    limit: 5,
    windowSeconds: 60 * 60,
  },
  customerRequestSubmit: {
    action: "customer_request_submit",
    burstMessage:
      "Güvenlik nedeniyle kısa süre içinde tekrar talep gönderemezsiniz. Lütfen biraz sonra tekrar deneyin.",
    limit: 5,
    limitMessage:
      "Günlük talep limitine ulaştınız. Acil durumlar için DENTech Medikal ile iletişime geçin.",
    minIntervalSeconds: 60,
    windowSeconds: 60 * 60 * 24,
  },
  requestItemMutation: {
    action: "request_item_mutation",
    burstMessage:
      "Çok kısa sürede fazla işlem yapıldı. Lütfen birkaç saniye sonra tekrar deneyin.",
    limit: 30,
    windowSeconds: 60,
  },
} satisfies Record<string, RateLimitPolicy>;

export class RateLimitExceededError extends Error {
  readonly status = 429;
  readonly retryAfterSeconds: number;
  readonly reason: "min_interval" | "window_limit";

  constructor({
    message,
    reason,
    retryAfterSeconds,
  }: {
    message: string;
    reason: "min_interval" | "window_limit";
    retryAfterSeconds: number;
  }) {
    super(message);
    this.name = "RateLimitExceededError";
    this.reason = reason;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function assertRateLimit({ policy, userId }: RateLimitAssertionInput) {
  const supabase = getSupabaseAdminClient();
  const windowStart = new Date(Date.now() - policy.windowSeconds * 1000).toISOString();
  const limit = Math.max(policy.limit, 1);
  const { data, error } = await supabase
    .from("rate_limit_events")
    .select("created_at")
    .eq("action", policy.action)
    .eq("user_id", userId)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const events = ((data ?? []) as RateLimitEventRow[]).filter((event) => event.created_at);
  const latestEvent = events[0] ?? null;

  if (policy.minIntervalSeconds && latestEvent) {
    const elapsedSeconds = getElapsedSeconds(latestEvent.created_at);

    if (elapsedSeconds < policy.minIntervalSeconds) {
      throw new RateLimitExceededError({
        message: policy.burstMessage,
        reason: "min_interval",
        retryAfterSeconds: Math.max(policy.minIntervalSeconds - elapsedSeconds, 1),
      });
    }
  }

  if (events.length >= limit) {
    const oldestEventWithinWindow = events[events.length - 1];
    const elapsedSeconds = getElapsedSeconds(oldestEventWithinWindow.created_at);
    const retryAfterSeconds = Math.max(policy.windowSeconds - elapsedSeconds, 1);

    throw new RateLimitExceededError({
      message: policy.limitMessage ?? policy.burstMessage,
      reason: "window_limit",
      retryAfterSeconds,
    });
  }
}

export async function recordRateLimitEvent({
  action,
  metadata,
  userId,
}: RateLimitEventInput) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("rate_limit_events").insert({
    action,
    metadata: metadata ?? null,
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function logRateLimitBlockedAttempt({
  action,
  metadata,
  reason,
  userId,
}: RateLimitAuditInput) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    action: `${action}_blocked`,
    entity_type: RATE_LIMIT_ENTITY_TYPE,
    new_value: {
      action,
      metadata: metadata ?? null,
      reason,
      retention_days: RATE_LIMIT_RETENTION_DAYS,
    },
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function isRateLimitExceededError(error: unknown): error is RateLimitExceededError {
  return error instanceof RateLimitExceededError;
}

function getElapsedSeconds(createdAt: string) {
  const createdAtTime = new Date(createdAt).getTime();

  if (!Number.isFinite(createdAtTime)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.max(Math.floor((Date.now() - createdAtTime) / 1000), 0);
}
