// apps/web/app/composables/media/useGenres.ts
import type { GenresResponse } from "@foundit/types";

// Cached once per session -- /api/v1/genres barely changes.
export function useGenres() {
  const { apiFetch } = useApi();

  const { data } = useAsyncData("genres", () =>
    apiFetch<{ success: boolean; data: GenresResponse }>("/api/v1/genres").then(
      (res) => res.data,
    ),
  );

  function getGenreNames(
    genreIds: number[],
    mediaType: "movie" | "series",
  ): string[] {
    const catalog = mediaType === "movie" ? data.value?.movie : data.value?.tv;
    if (!catalog) return [];
    const byId = new Map(catalog.map((g) => [g.id, g.name]));
    return genreIds
      .map((id) => byId.get(id))
      .filter((name): name is string => !!name);
  }

  return { getGenreNames };
}
