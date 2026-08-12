import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const recipeRatings = sqliteTable("recipe_ratings", {
  dishId: text("dish_id").primaryKey(),
  rating: text("rating").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const dailyArchives = sqliteTable("daily_archives", {
  id: text("id").primaryKey(),
  date: text("date").notNull().unique(),
  ingredients: text("ingredients").notNull(),
  totalIntake: text("total_intake").notNull(),
  improvement: text("improvement").notNull(),
  meals: text("meals").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
