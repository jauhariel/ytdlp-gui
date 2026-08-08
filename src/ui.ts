// ============================================================
//  UI: HTML + CSS + JS di-embed ke dalam exe (text imports)
// ============================================================
import html from "../ui/index.html" with { type: "text" };
import css from "../ui/style.css" with { type: "text" };
import js from "../ui/app.js" with { type: "text" };

export const PAGE = html
  .replace("<style>/*__CSS__*/</style>", () => "<style>" + css + "</style>")
  .replace("<script>/*__JS__*/</script>", () => "<script>" + js + "</script>");
