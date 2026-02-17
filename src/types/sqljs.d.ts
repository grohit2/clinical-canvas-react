declare module 'sql.js/dist/sql-asm.js' {
  const initSqlJs: () => Promise<{
    Database: new (data?: Uint8Array) => {
      run: (sql: string, params?: unknown[]) => void;
      prepare: (sql: string) => {
        bind: (values?: unknown[] | Record<string, unknown>) => void;
        step: () => boolean;
        get: () => unknown[];
        free: () => void;
      };
      export: () => Uint8Array;
    };
  }>;

  export default initSqlJs;
}
