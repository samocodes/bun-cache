import { Database } from "bun:sqlite";

/**
 * A class representing a cache using Bun's SQLite.
 */
class BunCache {
  private cache: Database;

  /**
   * Creates a new instance of the BunCache class.
   */
  constructor(persistance: boolean = false) {
    this.cache = new Database(persistance ? "cache.sqlite" : ":memory:");
    this.initializeSchema();
  }

  /**
   * Initializes the cache schema.
   */
  private initializeSchema() {
    this.cache.run(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        ttl INTEGER,
        UNIQUE(key)
      );
    `);
  }

  /**
   * Retrieves the value associated with a key from the cache.
   * @param key - The key for which to fetch the value.
   * @returns The value if the key exists and hasn't expired, `null` otherwise.
   */
  get(key: string): string | object | boolean | null {
    const query = this.cache.prepare(
      "SELECT value, ttl FROM cache WHERE key = ?",
    );
    const result = query.get(key) as CacheSchema | null;
    if (!result) return null;

    if (result.value === null) return true;

    const currentTime = Date.now();

    if (result.ttl === null || result.ttl > currentTime) {
      try {
        return JSON.parse(result.value);
      } catch (error) {
        return result.value;
      }
    }

    this.delete(key);
    return null;
  }

  /**
   * Adds a value to the cache.
   * @param key - The key under which to store the value.
   * @param value - The value to be stored.
   * @param ttl - The time-to-live for the value, in milliseconds.
   * @returns `true` if the value was successfully stored, `false` otherwise.
   */
  put(key: string, value: string | object | null, ttl?: number): boolean {
    const expirationTime = typeof ttl === "undefined" ? null : Date.now() + ttl;

    try {
      this.cache.run("INSERT OR REPLACE INTO cache VALUES (?, ?, ?)", [
        key,
        value ? JSON.stringify(value) : null,
        expirationTime,
      ]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Removes a key from the cache.
   * @param key - The key to be deleted.
   * @returns `true` if the key was successfully deleted, `false` otherwise.
   */
  delete(key: string): boolean {
    try {
      this.cache.run("DELETE FROM cache WHERE key = ?", [key]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if a key exists in the cache.
   * @param key - The key to be checked
   * @returns `true` if the key exists, `false` otherwise
   */
  hasKey(key: string): boolean {
    try {
      const query = this.cache.prepare("SELECT * FROM cache WHERE key = ?");
      return (query.get(key) as CacheSchema | null) !== null;
    } catch (error) {
      return false;
    }
  }
}

export default BunCache;

export interface CacheSchema {
  key: string;
  value: string | null;
  ttl: number | null;
}
