// apps/api/src/index.ts
import express from "express";
import { LOCALE_TO_TMDB_LANG } from "@foundit/types";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send(
    `FoundIt API is running! LOCALE_TO_TMDB_LANG['es'] = ${LOCALE_TO_TMDB_LANG["es"]}`,
  );
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
