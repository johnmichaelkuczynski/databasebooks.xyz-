import { 
  type User, 
  type InsertUser, 
  type StylometricAuthor, 
  type InsertStylometricAuthor,
  type AnalysisHistory,
  type InsertAnalysisHistory,
  users, 
  stylometricAuthors,
  analysisHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getStylometricAuthors(userId: number): Promise<StylometricAuthor[]>;
  getStylometricAuthor(id: number): Promise<StylometricAuthor | undefined>;
  getStylometricAuthorByName(userId: number, authorName: string): Promise<StylometricAuthor | undefined>;
  createStylometricAuthor(author: InsertStylometricAuthor): Promise<StylometricAuthor>;
  updateStylometricAuthor(id: number, author: Partial<InsertStylometricAuthor>): Promise<StylometricAuthor | undefined>;
  deleteStylometricAuthor(id: number): Promise<boolean>;
  
  createAnalysisHistory(history: InsertAnalysisHistory): Promise<AnalysisHistory>;
  getAnalysisHistory(userId: number): Promise<AnalysisHistory[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async getStylometricAuthors(userId: number): Promise<StylometricAuthor[]> {
    return await db.select().from(stylometricAuthors).where(eq(stylometricAuthors.userId, userId));
  }
  
  async getStylometricAuthor(id: number): Promise<StylometricAuthor | undefined> {
    const [author] = await db.select().from(stylometricAuthors).where(eq(stylometricAuthors.id, id));
    return author;
  }
  
  async getStylometricAuthorByName(userId: number, authorName: string): Promise<StylometricAuthor | undefined> {
    const [author] = await db.select().from(stylometricAuthors).where(
      and(
        eq(stylometricAuthors.userId, userId),
        eq(stylometricAuthors.authorName, authorName)
      )
    );
    return author;
  }
  
  async createStylometricAuthor(author: InsertStylometricAuthor): Promise<StylometricAuthor> {
    const [created] = await db.insert(stylometricAuthors).values(author).returning();
    return created;
  }
  
  async updateStylometricAuthor(id: number, author: Partial<InsertStylometricAuthor>): Promise<StylometricAuthor | undefined> {
    const [updated] = await db.update(stylometricAuthors)
      .set({ ...author, updatedAt: new Date() })
      .where(eq(stylometricAuthors.id, id))
      .returning();
    return updated;
  }
  
  async deleteStylometricAuthor(id: number): Promise<boolean> {
    const result = await db.delete(stylometricAuthors).where(eq(stylometricAuthors.id, id));
    return true;
  }
  
  async createAnalysisHistory(history: InsertAnalysisHistory): Promise<AnalysisHistory> {
    const [created] = await db.insert(analysisHistory).values(history).returning();
    return created;
  }
  
  async getAnalysisHistory(userId: number): Promise<AnalysisHistory[]> {
    return await db.select().from(analysisHistory).where(eq(analysisHistory.userId, userId));
  }
}

export const storage = new DatabaseStorage();
