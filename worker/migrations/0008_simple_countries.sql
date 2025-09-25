-- Simple Country Data Population
-- Populates the existing countries table with basic data
-- Run with: wrangler d1 execute dcom360-db --env production --remote --file migrations/0008_simple_countries.sql

-- Clear any existing country data first  
DELETE FROM countries;

-- Insert countries with existing schema (code, name, region, subregion, coordinates_lat, coordinates_lng, population)
INSERT OR REPLACE INTO countries (code, name, region, subregion, population, coordinates_lat, coordinates_lng) VALUES 
  ('US', 'United States', 'Americas', 'North America', 329484123, 38, -97),
  ('CN', 'China', 'Asia', 'Eastern Asia', 1402112000, 35, 105),
  ('IN', 'India', 'Asia', 'Southern Asia', 1380004385, 20, 77),
  ('ID', 'Indonesia', 'Asia', 'South-Eastern Asia', 273523621, -5, 120),
  ('PK', 'Pakistan', 'Asia', 'Southern Asia', 220892331, 30, 70),
  ('BR', 'Brazil', 'Americas', 'South America', 212559409, -10, -55),
  ('NG', 'Nigeria', 'Africa', 'Western Africa', 206139587, 10, 8),
  ('BD', 'Bangladesh', 'Asia', 'Southern Asia', 164689383, 24, 90),
  ('RU', 'Russia', 'Europe', 'Eastern Europe', 144104080, 60, 100),
  ('MX', 'Mexico', 'Americas', 'North America', 128932753, 23, -102),
  ('JP', 'Japan', 'Asia', 'Eastern Asia', 125836021, 36, 138),
  ('ET', 'Ethiopia', 'Africa', 'Eastern Africa', 114963583, 8, 38),
  ('PH', 'Philippines', 'Asia', 'South-Eastern Asia', 109581085, 13, 122),
  ('EG', 'Egypt', 'Africa', 'Northern Africa', 102334403, 27, 30),
  ('VN', 'Vietnam', 'Asia', 'South-Eastern Asia', 97338583, 16, 108),
  ('CD', 'DR Congo', 'Africa', 'Middle Africa', 108407721, -4, 25),
  ('TR', 'Turkey', 'Asia', 'Western Asia', 84339067, 39, 35),
  ('IR', 'Iran', 'Asia', 'Southern Asia', 83992953, 32, 53),
  ('DE', 'Germany', 'Europe', 'Western Europe', 83240525, 51, 9),
  ('TH', 'Thailand', 'Asia', 'South-Eastern Asia', 69799978, 15, 100),
  ('GB', 'United Kingdom', 'Europe', 'Northern Europe', 67215293, 54, -2),
  ('FR', 'France', 'Europe', 'Western Europe', 67391582, 46, 2),
  ('IT', 'Italy', 'Europe', 'Southern Europe', 59554023, 43, 13),
  ('ZA', 'South Africa', 'Africa', 'Southern Africa', 59308690, -29, 24),
  ('MM', 'Myanmar', 'Asia', 'South-Eastern Asia', 54409794, 22, 98),
  ('KE', 'Kenya', 'Africa', 'Eastern Africa', 53771300, 1, 38),
  ('KR', 'South Korea', 'Asia', 'Eastern Asia', 51780579, 37, 128),
  ('CO', 'Colombia', 'Americas', 'South America', 50882884, 4, -72),
  ('ES', 'Spain', 'Europe', 'Southern Europe', 47351567, 40, -4),
  ('UG', 'Uganda', 'Africa', 'Eastern Africa', 45741000, 1, 32),
  ('AR', 'Argentina', 'Americas', 'South America', 45376763, -34, -64),
  ('DZ', 'Algeria', 'Africa', 'Northern Africa', 44700000, 28, 3),
  ('SD', 'Sudan', 'Africa', 'Northern Africa', 43849269, 15, 30),
  ('UA', 'Ukraine', 'Europe', 'Eastern Europe', 44134693, 49, 32),
  ('IQ', 'Iraq', 'Asia', 'Western Asia', 40222503, 33, 44),
  ('AF', 'Afghanistan', 'Asia', 'Southern Asia', 40218234, 33, 65),
  ('PL', 'Poland', 'Europe', 'Central Europe', 37950802, 52, 20),
  ('CA', 'Canada', 'Americas', 'North America', 38005238, 60, -95),
  ('MA', 'Morocco', 'Africa', 'Northern Africa', 36910558, 32, -5),
  ('SA', 'Saudi Arabia', 'Asia', 'Western Asia', 34813867, 25, 45),
  ('UZ', 'Uzbekistan', 'Asia', 'Central Asia', 34232050, 41, 64),
  ('PE', 'Peru', 'Americas', 'South America', 32971846, -10, -76),
  ('AO', 'Angola', 'Africa', 'Middle Africa', 32866268, -13, 19),
  ('MY', 'Malaysia', 'Asia', 'South-Eastern Asia', 32365998, 3, 113),
  ('MZ', 'Mozambique', 'Africa', 'Eastern Africa', 31255435, -18, 35),
  ('GH', 'Ghana', 'Africa', 'Western Africa', 31072945, 8, -2),
  ('YE', 'Yemen', 'Asia', 'Western Asia', 29825968, 15, 48),
  ('NP', 'Nepal', 'Asia', 'Southern Asia', 29136808, 28, 84),
  ('VE', 'Venezuela', 'Americas', 'South America', 28435943, 8, -66),
  ('MG', 'Madagascar', 'Africa', 'Eastern Africa', 27691019, -20, 47),
  ('CI', 'Ivory Coast', 'Africa', 'Western Africa', 26378275, 8, -5),
  ('CM', 'Cameroon', 'Africa', 'Middle Africa', 26545864, 6, 12),
  ('AU', 'Australia', 'Oceania', 'Australia and New Zealand', 25687041, -27, 133),
  ('KP', 'North Korea', 'Asia', 'Eastern Asia', 25778815, 40, 127),
  ('TZ', 'Tanzania', 'Africa', 'Eastern Africa', 59734213, -6, 35),
  ('NE', 'Niger', 'Africa', 'Western Africa', 24206636, 16, 8),
  ('LK', 'Sri Lanka', 'Asia', 'Southern Asia', 21919000, 7, 81),
  ('BF', 'Burkina Faso', 'Africa', 'Western Africa', 20903278, 13, -2),
  ('ML', 'Mali', 'Africa', 'Western Africa', 20250834, 17, -4),
  ('RO', 'Romania', 'Europe', 'Southeast Europe', 19286123, 46, 25),
  ('MW', 'Malawi', 'Africa', 'Eastern Africa', 19129955, -14, 34),
  ('CL', 'Chile', 'Americas', 'South America', 19116209, -30, -71),
  ('KZ', 'Kazakhstan', 'Asia', 'Central Asia', 18754440, 48, 67),
  ('ZM', 'Zambia', 'Africa', 'Eastern Africa', 18383956, -15, 30),
  ('SY', 'Syria', 'Asia', 'Western Asia', 17500657, 35, 38),
  ('EC', 'Ecuador', 'Americas', 'South America', 17643060, -2, -78),
  ('KH', 'Cambodia', 'Asia', 'South-Eastern Asia', 16718971, 13, 105),
  ('GT', 'Guatemala', 'Americas', 'Central America', 16858333, 16, -90),
  ('NL', 'Netherlands', 'Europe', 'Western Europe', 16655799, 53, 6),
  ('SO', 'Somalia', 'Africa', 'Eastern Africa', 15893219, 10, 49),
  ('ZW', 'Zimbabwe', 'Africa', 'Southern Africa', 14862927, -20, 30),
  ('GN', 'Guinea', 'Africa', 'Western Africa', 13132792, 11, -10),
  ('BJ', 'Benin', 'Africa', 'Western Africa', 12123198, 10, 2),
  ('BI', 'Burundi', 'Africa', 'Eastern Africa', 11890781, -4, 30),
  ('BO', 'Bolivia', 'Americas', 'South America', 11673029, -17, -65),
  ('BE', 'Belgium', 'Europe', 'Western Europe', 11555997, 51, 4),
  ('HT', 'Haiti', 'Americas', 'Caribbean', 11402533, 19, -72),
  ('CU', 'Cuba', 'Americas', 'Caribbean', 11326616, 22, -80),
  ('TN', 'Tunisia', 'Africa', 'Northern Africa', 11818618, 34, 9),
  ('SS', 'South Sudan', 'Africa', 'Middle Africa', 11193729, 7, 30),
  ('DO', 'Dominican Republic', 'Americas', 'Caribbean', 10847904, 19, -71),
  ('CZ', 'Czechia', 'Europe', 'Central Europe', 10698896, 50, 16),
  ('GR', 'Greece', 'Europe', 'Southern Europe', 10715549, 39, 22),
  ('SE', 'Sweden', 'Europe', 'Northern Europe', 10353442, 62, 15),
  ('PT', 'Portugal', 'Europe', 'Southern Europe', 10305564, 40, -8),
  ('JO', 'Jordan', 'Asia', 'Western Asia', 10203140, 31, 36),
  ('AZ', 'Azerbaijan', 'Asia', 'Western Asia', 10110116, 41, 48),
  ('HU', 'Hungary', 'Europe', 'Central Europe', 9749763, 47, 20),
  ('HN', 'Honduras', 'Americas', 'Central America', 9904608, 15, -87),
  ('AE', 'United Arab Emirates', 'Asia', 'Western Asia', 9890400, 24, 54),
  ('BY', 'Belarus', 'Europe', 'Eastern Europe', 9398861, 53, 28),
  ('IL', 'Israel', 'Asia', 'Western Asia', 9216900, 31, 35),
  ('PG', 'Papua New Guinea', 'Oceania', 'Melanesia', 8947027, -6, 147),
  ('AT', 'Austria', 'Europe', 'Central Europe', 8917205, 47, 13),
  ('CH', 'Switzerland', 'Europe', 'Western Europe', 8654622, 47, 8),
  ('TG', 'Togo', 'Africa', 'Western Africa', 8278737, 8, 1),
  ('SL', 'Sierra Leone', 'Africa', 'Western Africa', 7976985, 9, -12),
  ('LA', 'Laos', 'Asia', 'South-Eastern Asia', 7275556, 18, 105),
  ('PY', 'Paraguay', 'Americas', 'South America', 7132530, -23, -58),
  ('BG', 'Bulgaria', 'Europe', 'Southeast Europe', 6927288, 43, 25),
  ('RS', 'Serbia', 'Europe', 'Southeast Europe', 6908224, 44, 21),
  ('LB', 'Lebanon', 'Asia', 'Western Asia', 6825442, 34, 36),
  ('NI', 'Nicaragua', 'Americas', 'Central America', 6624554, 13, -85),
  ('KG', 'Kyrgyzstan', 'Asia', 'Central Asia', 6591600, 41, 75),
  ('SV', 'El Salvador', 'Americas', 'Central America', 6486201, 14, -89),
  ('TJ', 'Tajikistan', 'Asia', 'Central Asia', 9537642, 39, 71),
  ('DK', 'Denmark', 'Europe', 'Northern Europe', 5831404, 56, 10),
  ('SG', 'Singapore', 'Asia', 'South-Eastern Asia', 5685807, 1, 104),
  ('FI', 'Finland', 'Europe', 'Northern Europe', 5530719, 64, 26),
  ('SK', 'Slovakia', 'Europe', 'Central Europe', 5458827, 49, 20),
  ('NO', 'Norway', 'Europe', 'Northern Europe', 5379475, 62, 10),
  ('ER', 'Eritrea', 'Africa', 'Eastern Africa', 5352000, 15, 39),
  ('OM', 'Oman', 'Asia', 'Western Asia', 5106622, 21, 57),
  ('NZ', 'New Zealand', 'Oceania', 'Australia and New Zealand', 5084300, -41, 174),
  ('CR', 'Costa Rica', 'Americas', 'Central America', 5094114, 10, -84),
  ('LR', 'Liberia', 'Africa', 'Western Africa', 5057677, 7, -10),
  ('IE', 'Ireland', 'Europe', 'Northern Europe', 4994724, 53, -8),
  ('CF', 'Central African Republic', 'Africa', 'Middle Africa', 4829764, 7, 21),
  ('MR', 'Mauritania', 'Africa', 'Western Africa', 4649660, 20, -12),
  ('PA', 'Panama', 'Americas', 'Central America', 4314768, 9, -80),
  ('KW', 'Kuwait', 'Asia', 'Western Asia', 4270563, 30, 46),
  ('HR', 'Croatia', 'Europe', 'Southeast Europe', 4047200, 45, 16),
  ('GE', 'Georgia', 'Asia', 'Western Asia', 3714000, 42, 44),
  ('UY', 'Uruguay', 'Americas', 'South America', 3473727, -33, -56),
  ('BA', 'Bosnia and Herzegovina', 'Europe', 'Southeast Europe', 3280815, 44, 18),
  ('MN', 'Mongolia', 'Asia', 'Eastern Asia', 3278292, 46, 105),
  ('AM', 'Armenia', 'Asia', 'Western Asia', 2963234, 40, 45),
  ('JM', 'Jamaica', 'Americas', 'Caribbean', 2961161, 18, -78),
  ('QA', 'Qatar', 'Asia', 'Western Asia', 2881060, 26, 51),
  ('AL', 'Albania', 'Europe', 'Southeast Europe', 2837743, 41, 20),
  ('LV', 'Latvia', 'Europe', 'Northern Europe', 1901548, 57, 25),
  ('LT', 'Lithuania', 'Europe', 'Northern Europe', 2794700, 56, 24),
  ('MD', 'Moldova', 'Europe', 'Eastern Europe', 2617820, 47, 29),
  ('NA', 'Namibia', 'Africa', 'Southern Africa', 2540916, -22, 17);

-- Update existing disaster records to use standardized country codes
UPDATE disasters SET country = 'US' WHERE country = 'United States';
UPDATE disasters SET country = 'GB' WHERE country = 'United Kingdom';  
UPDATE disasters SET country = 'RU' WHERE country = 'Russia';
UPDATE disasters SET country = 'ID' WHERE country = 'Indonesia';
UPDATE disasters SET country = 'PH' WHERE country = 'Philippines';
UPDATE disasters SET country = 'PG' WHERE country = 'Papua New Guinea';
UPDATE disasters SET country = 'NZ' WHERE country = 'New Zealand';
UPDATE disasters SET country = 'ZA' WHERE country = 'South Africa';
UPDATE disasters SET country = 'SA' WHERE country = 'Saudi Arabia';
UPDATE disasters SET country = 'AE' WHERE country = 'United Arab Emirates';
UPDATE disasters SET country = 'CN' WHERE country = 'China';
UPDATE disasters SET country = 'JP' WHERE country = 'Japan';
UPDATE disasters SET country = 'IN' WHERE country = 'India';
UPDATE disasters SET country = 'MM' WHERE country = 'Myanmar';
UPDATE disasters SET country = 'MM' WHERE country = 'Burma';
UPDATE disasters SET country = 'CD' WHERE country = 'Democratic Republic of the Congo';
UPDATE disasters SET country = 'CG' WHERE country = 'Congo';
UPDATE disasters SET country = 'CI' WHERE country = 'Ivory Coast';
UPDATE disasters SET country = 'CI' WHERE country = 'Côte d''Ivoire';
UPDATE disasters SET country = 'IR' WHERE country = 'Iran';
UPDATE disasters SET country = 'KP' WHERE country = 'North Korea';
UPDATE disasters SET country = 'KR' WHERE country = 'South Korea';
UPDATE disasters SET country = 'VN' WHERE country = 'Vietnam';
UPDATE disasters SET country = 'LA' WHERE country = 'Laos';
UPDATE disasters SET country = 'TH' WHERE country = 'Thailand';
UPDATE disasters SET country = 'MY' WHERE country = 'Malaysia';
UPDATE disasters SET country = 'SG' WHERE country = 'Singapore';
UPDATE disasters SET country = 'BN' WHERE country = 'Brunei';
UPDATE disasters SET country = 'KH' WHERE country = 'Cambodia';
UPDATE disasters SET country = 'TW' WHERE country = 'Taiwan';
UPDATE disasters SET country = 'HK' WHERE country = 'Hong Kong';
UPDATE disasters SET country = 'MO' WHERE country = 'Macau';
UPDATE disasters SET country = 'MO' WHERE country = 'Macao';