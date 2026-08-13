// apps/web/app/composables/media/useCrewLabel.ts
/**
 * A crew card has one line and a person can have five jobs. Showing the two
 * that matter and counting the rest keeps the card readable without hiding
 * that there's more — the full list goes in the tooltip, where it costs
 * nothing until someone asks for it.
 *
 * The API already orders each person's jobs by weight, so "the first two" is
 * "the two that matter" without the client re-deciding it.
 */
const VISIBLE_JOBS = 2;

export function useCrewLabel() {
  const { t } = useI18n();

  function crewLabel(jobs: string[]): string {
    const shown = jobs.slice(0, VISIBLE_JOBS).join(", ");
    const rest = jobs.length - VISIBLE_JOBS;
    return rest > 0
      ? `${shown} ${t("mediaDetail.andMore", { count: rest })}`
      : shown;
  }

  function crewTitle(jobs: string[]): string {
    return jobs.join(", ");
  }

  return { crewLabel, crewTitle };
}
