import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const recipeRatings = sqliteTable("recipe_ratings", {
  dishId: text("dish_id").primaryKey(),
  rating: text("rating").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
