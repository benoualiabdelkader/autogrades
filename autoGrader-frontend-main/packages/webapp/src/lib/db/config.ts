// Database Configuration for Moodle Connection
export interface DatabaseConfig {
  dbtype: string;
  dblibrary: string;
  dbhost: string;
  dbname: string;
  dbuser: string;
  dbpass: string;
  prefix: string;
  dbport: number;
  dbcollation: string;
}

export const defaultMoodleConfig: DatabaseConfig = {
  dbtype: 'mariadb',
  dblibrary: 'native',
  dbhost: '127.0.0.1',
  dbname: 'moodle',
  dbuser: 'root',
  dbpass: '',
  prefix: 'mdl_',
  dbport: 3307,
  dbcollation: 'utf8mb4_unicode_ci'
};

// For AutoGrader - Option 1: Same DB with different prefix
export const autoGraderConfig: DatabaseConfig = {
  dbtype: 'mariadb',
  dblibrary: 'native',
  dbhost: '127.0.0.1',
  dbname: 'moodle',
  dbuser: 'root',
  dbpass: '',
  prefix: 'ag_', // AutoGrader prefix
  dbport: 3307,
  dbcollation: 'utf8mb4_unicode_ci'
};

// For AutoGrader - Option 2: New Database
export const autoGraderNewDBConfig: DatabaseConfig = {
  dbtype: 'mariadb',
  dblibrary: 'native',
  dbhost: '127.0.0.1',
  dbname: 'autograder_db',
  dbuser: 'root',
  dbpass: '',
  prefix: 'ag_',
  dbport: 3307,
  dbcollation: 'utf8mb4_unicode_ci'
};

// Get current config from environment or use default
export function getDatabaseConfig(): DatabaseConfig {
  return {
    dbtype: process.env.DB_TYPE || defaultMoodleConfig.dbtype,
    dblibrary: process.env.DB_LIBRARY || defaultMoodleConfig.dblibrary,
    dbhost: process.env.DB_HOST || defaultMoodleConfig.dbhost,
    dbname: process.env.DB_NAME || defaultMoodleConfig.dbname,
    dbuser: process.env.DB_USER || defaultMoodleConfig.dbuser,
    dbpass: process.env.DB_PASS || defaultMoodleConfig.dbpass,
    prefix: process.env.DB_PREFIX || defaultMoodleConfig.prefix,
    dbport: parseInt(process.env.DB_PORT || String(defaultMoodleConfig.dbport)),
    dbcollation: process.env.DB_COLLATION || defaultMoodleConfig.dbcollation
  };
}
