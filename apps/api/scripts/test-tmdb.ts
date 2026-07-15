// apps/api/scripts/test-tmdb.ts (bórralo después de probar)
import { fetchTmdbWithFallback } from "../src/lib/tmdb";
import type { TmdbMovie, TmdbPerson } from "../src/types/tmdb.types";

const movie = await fetchTmdbWithFallback<TmdbMovie>("/movie/550", {}, "es");
console.log(movie.title, "|", movie.overview?.slice(0, 80));

const person = await fetchTmdbWithFallback<TmdbPerson>("/person/1", {}, "en"); // biografías se traducen menos, buen candidato a forzar el fallback
console.log(person.name, "|", person.biography?.slice(0, 80));
