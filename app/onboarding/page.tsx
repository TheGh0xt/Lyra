"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { categoryGlyph } from "@/lib/ui/category-display";
import { describeProblem, isProblem, type CategoriesResponse, type InterestCategory } from "@/lib/api/client";
import { MAX_INTERESTS, MIN_INTERESTS, defaultSelection, toggleCategory } from "@/lib/onboarding/selection";

/**
 * Interest-category picker (UI_PRD §6.3) — the screen immediately after
 * sign-up, before the app has anything personalised to show.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<InterestCategory[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/interests/categories")
      .then(async (response) => {
        if (!response.ok) throw new Error("categories request failed");
        const payload = (await response.json()) as CategoriesResponse;
        if (!cancelled) setCategories(payload.categories);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load categories. Refresh to try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(categorySlugs: string[]) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/me/interests", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categories: categorySlugs }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setSubmitError(describeProblem(isProblem(payload) ? payload : null));
        setSubmitting(false);
        return;
      }
      router.push("/mfa");
    } catch {
      setSubmitError("Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  const canSubmit = selected.length >= MIN_INTERESTS && selected.length <= MAX_INTERESTS;

  return (
    <AuthShell
      width="max-w-2xl"
      eyebrow="Almost there"
      title="What do you want to watch?"
      subtitle={`Pick ${MIN_INTERESTS} to ${MAX_INTERESTS} categories. Your feed only shows markets moving in these — you can change them later in settings.`}
    >
      {loadError ? (
        <p role="alert" className="font-sans text-sm text-ro">
          {loadError}
        </p>
      ) : !categories ? (
        <p className="font-sans text-sm text-dim">Loading categories…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {categories.map((category) => {
              const isSelected = selected.includes(category.slug);
              return (
                <button
                  key={category.slug}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected((prev) => toggleCategory(prev, category.slug))}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-[13px] border p-3.5 text-left transition-colors",
                    isSelected
                      ? "border-violet bg-violet-soft"
                      : "border-line bg-elev hover:border-line-2",
                  )}
                >
                  <span className="text-lg text-violet-text" aria-hidden="true">
                    {categoryGlyph(category.slug)}
                  </span>
                  <span className="font-sans text-[13px] font-semibold text-text">
                    {category.label}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="font-sans text-xs text-faint" aria-live="polite">
            {selected.length} of {MAX_INTERESTS} selected
            {selected.length < MIN_INTERESTS ? ` — pick at least ${MIN_INTERESTS}` : ""}
          </p>

          {submitError ? (
            <p role="alert" className="font-sans text-sm text-ro">
              {submitError}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => save(defaultSelection(categories))}
              disabled={submitting}
              className="font-sans text-xs font-medium text-faint hover:text-dim"
            >
              Skip — use defaults
            </button>
            <Button
              type="button"
              onClick={() => save(selected)}
              disabled={!canSubmit || submitting}
            >
              {submitting ? "Saving…" : "Continue"}
            </Button>
          </div>
        </>
      )}
    </AuthShell>
  );
}
