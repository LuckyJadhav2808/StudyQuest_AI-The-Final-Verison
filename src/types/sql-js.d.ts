declare module 'sql.js' {
  interface Database {
    run(sql: string): void;
    exec(sql: string): { columns: string[]; values: (string | number | null)[][] }[];
    export(): Uint8Array;
    close(): void;
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  function initSqlJs(config?: Record<string, unknown>): Promise<SqlJsStatic>;
  export default initSqlJs;
}
