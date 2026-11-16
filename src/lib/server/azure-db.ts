import { Pool, type PoolConfig } from 'pg';

let pool: Pool | null = null;

export function parseAzureConnectionString(connStr: string): PoolConfig {
  // If the password contains unencoded special characters like '@' or '#'
  // (e.g. postgresql://focalystadmin:F0c@lyst#Db2026!x9Z@focalyst-db-prod-02...)
  // standard URL parsing splits at the first '@' causing hostname to become 'lyst'.
  // We use regex to robustly parse the last '@' as the delimiter before the host.
  const regex = /^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/;
  const match = connStr.match(regex);
  if (match) {
    const [, user, password, host, port, database] = match;
    return {
      user,
      password,
      host,
      port: port ? parseInt(port, 10) : 5432,
      database,
    };
  }

  return { connectionString: connStr };
}

export function getAzurePool(): Pool | null {
  const connectionString = process.env.AZURE_POSTGRES_URL;
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    const config = parseAzureConnectionString(connectionString);
    pool = new Pool({
      ...config,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
    });
  }

  return pool;
}
