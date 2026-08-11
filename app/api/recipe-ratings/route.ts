import { getDb } from "../../../db";
import { recipeRatings } from "../../../db/schema";

const allowed = new Set(["好吃", "还行", "祛除"]);

export async function GET() {
  try {
    const ratings = await getDb().select().from(recipeRatings);
    return Response.json({ ratings });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { dishId, rating } = await request.json() as { dishId?: string; rating?: string };
    if (!dishId || !rating || !allowed.has(rating)) return Response.json({ error: "无效标记" }, { status: 400 });
    await getDb().insert(recipeRatings).values({ dishId, rating }).onConflictDoUpdate({ target: recipeRatings.dishId, set: { rating, updatedAt: new Date().toISOString() } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 });
  }
}
