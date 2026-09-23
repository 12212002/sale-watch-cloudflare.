export function mailSchema(db){db.exec(`
CREATE TABLE IF NOT EXISTS mail_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,address TEXT NOT NULL,min_percent REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS verified_addresses(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,address TEXT NOT NULL,PRIMARY KEY(user_id,address));
CREATE TABLE IF NOT EXISTS mail_codes(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,purpose TEXT NOT NULL,address TEXT NOT NULL,code TEXT NOT NULL,expires INTEGER NOT NULL,tries INTEGER DEFAULT 0,PRIMARY KEY(user_id,purpose));
CREATE TABLE IF NOT EXISTS mail_attempts(id TEXT PRIMARY KEY,at INTEGER NOT NULL,state TEXT NOT NULL);
`);}
