// the subset of the D1 binding eventsStore.js uses, over Cloudflare's HTTP API

const API = "https://api.cloudflare.com/client/v4";

export function createD1Binding({ accountId, databaseId, token }) {
  async function query(sql, params) {
    const response = await fetch(
      `${API}/accounts/${accountId}/d1/database/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql, params }),
      },
    );
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      const detail = body?.errors?.map((e) => e.message).join("; ");
      throw new Error(`D1 HTTP ${response.status}: ${detail || "no details"}`);
    }
    return body.result[0];
  }

  class Statement {
    constructor(sql, params = []) {
      this.sql = sql;
      this.params = params;
    }
    bind(...params) {
      return new Statement(this.sql, params);
    }
    async first() {
      return (await query(this.sql, this.params)).results[0] ?? null;
    }
    async all() {
      return { results: (await query(this.sql, this.params)).results };
    }
    run() {
      return query(this.sql, this.params);
    }
  }

  return {
    prepare: (sql) => new Statement(sql),
    // not a transaction: callers put the cursor write last, inserts are OR IGNORE
    async batch(statements) {
      for (const statement of statements) await statement.run();
    },
  };
}
