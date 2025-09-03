CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT,
  subregion TEXT,
  coordinates_lat REAL,
  coordinates_lng REAL,
  population INTEGER
);

INSERT OR IGNORE INTO countries (code, name) VALUES
 ('US','United States'),('NG','Nigeria'),('TR','Türkiye'),('TL','Testland'),('RC','River Country'),('HS','Hills State');
