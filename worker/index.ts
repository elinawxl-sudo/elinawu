/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const archiveOrigins = new Set([
  "https://zhu-wu-family-diet-health.vercel.app",
  "https://jiawei-healthy-table.cargdentecalti.chatgpt.site",
]);

function archiveHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": archiveOrigins.has(origin) ? origin : "https://zhu-wu-family-diet-health.vercel.app",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

async function handleDailyArchives(request: Request, env: Env) {
  const headers = archiveHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS daily_archives (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    ingredients TEXT NOT NULL,
    total_intake TEXT NOT NULL,
    improvement TEXT NOT NULL,
    meals TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();

  if (request.method === "GET") {
    const result = await env.DB.prepare("SELECT id, date, ingredients, total_intake, improvement, meals, created_at, updated_at FROM daily_archives ORDER BY date DESC LIMIT 90").all();
    const archives = result.results.map((row) => ({
      id: row.id,
      date: row.date,
      ingredients: JSON.parse(String(row.ingredients)),
      totalIntake: JSON.parse(String(row.total_intake)),
      improvement: row.improvement,
      meals: JSON.parse(String(row.meals)),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    return Response.json({ archives }, { headers });
  }

  if (request.method === "POST") {
    const value = await request.json() as Record<string, unknown>;
    const date = typeof value.date === "string" ? value.date : "";
    const improvement = typeof value.improvement === "string" ? value.improvement : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(value.ingredients) || !value.totalIntake || !Array.isArray(value.meals) || !improvement) {
      return Response.json({ error: "invalid archive" }, { status: 400, headers });
    }
    const now = new Date().toISOString();
    const id = `daily-${date}`;
    await env.DB.prepare(`INSERT INTO daily_archives (id, date, ingredients, total_intake, improvement, meals, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET ingredients = excluded.ingredients, total_intake = excluded.total_intake,
      improvement = excluded.improvement, meals = excluded.meals, updated_at = excluded.updated_at`)
      .bind(id, date, JSON.stringify(value.ingredients), JSON.stringify(value.totalIntake), improvement, JSON.stringify(value.meals), now, now).run();
    return Response.json({ saved: true, id, date, updatedAt: now }, { headers });
  }

  return Response.json({ error: "method not allowed" }, { status: 405, headers });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/daily-archives") {
      return handleDailyArchives(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
