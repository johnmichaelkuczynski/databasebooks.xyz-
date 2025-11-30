import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const stylometricAuthors = pgTable("stylometric_authors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  sourceTitle: varchar("source_title", { length: 500 }),
  wordCount: integer("word_count"),
  verticalityScore: decimal("verticality_score", { precision: 4, scale: 3 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  rawFeatures: jsonb("raw_features"),
  signaturePhrases: jsonb("signature_phrases"),
  negativeMarkers: jsonb("negative_markers"),
  sampleSentences: jsonb("sample_sentences"),
  closestAuthorMatch: varchar("closest_author_match", { length: 255 }),
  matchExplanation: text("match_explanation"),
  psychologicalProfile: jsonb("psychological_profile"),
  narrativeSummary: text("narrative_summary"),
  clustering: jsonb("clustering"),
  fullReport: text("full_report"),
});

export const insertStylometricAuthorSchema = createInsertSchema(stylometricAuthors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStylometricAuthor = z.infer<typeof insertStylometricAuthorSchema>;
export type StylometricAuthor = typeof stylometricAuthors.$inferSelect;

export const analysisHistory = pgTable("analysis_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  analysisType: varchar("analysis_type", { length: 50 }).notNull(),
  provider: varchar("provider", { length: 50 }),
  inputPreview: text("input_preview"),
  outputData: jsonb("output_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnalysisHistorySchema = createInsertSchema(analysisHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalysisHistory = z.infer<typeof insertAnalysisHistorySchema>;
export type AnalysisHistory = typeof analysisHistory.$inferSelect;
