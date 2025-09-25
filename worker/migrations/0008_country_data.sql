-- Country Data Migration for Flare360
-- Extends countries table with comprehensive data from REST Countries API
-- Run with: wrangler d1 execute dcom360-db --env production --remote --file migrations/0008_country_data.sql

-- Add any missing columns to the countries table (skip existing ones)
-- region, subregion, coordinates_lat, coordinates_lng, population already exist

-- Add remaining columns
ALTER TABLE countries ADD COLUMN official_name TEXT;
ALTER TABLE countries ADD COLUMN flag TEXT;
ALTER TABLE countries ADD COLUMN flag_url TEXT;
ALTER TABLE countries ADD COLUMN capital TEXT;
ALTER TABLE countries ADD COLUMN area REAL;
ALTER TABLE countries ADD COLUMN languages TEXT;
ALTER TABLE countries ADD COLUMN currencies TEXT;
ALTER TABLE countries ADD COLUMN timezones TEXT;
ALTER TABLE countries ADD COLUMN iso3 TEXT;
ALTER TABLE countries ADD COLUMN numeric_code TEXT;

-- Clear any existing country data first
DELETE FROM countries;

-- Insert comprehensive country data
INSERT OR REPLACE INTO countries (
  code, name, official_name, region, subregion, population,
  coordinates_lat, coordinates_lng, flag, flag_url, capital,
  area, languages, currencies, timezones, iso3, numeric_code
) VALUES 
  ('US', 'United States', 'United States of America', 'Americas', 'North America', 329484123, 38, -97, '🇺🇸', 'https://flagcdn.com/us.svg', 'Washington, D.C.', 9372610, 'English', 'USD', 'UTC-12:00, UTC-11:00, UTC-10:00, UTC-09:00, UTC-08:00, UTC-07:00, UTC-06:00, UTC-05:00, UTC-04:00, UTC+10:00, UTC+12:00', 'USA', '840'),
  ('CN', 'China', 'People''s Republic of China', 'Asia', 'Eastern Asia', 1402112000, 35, 105, '🇨🇳', 'https://flagcdn.com/cn.svg', 'Beijing', 9706961, 'Chinese', 'CNY', 'UTC+08:00', 'CHN', '156'),
  ('IN', 'India', 'Republic of India', 'Asia', 'Southern Asia', 1380004385, 20, 77, '🇮🇳', 'https://flagcdn.com/in.svg', 'New Delhi', 3287590, 'English, Hindi, Tamil', 'INR', 'UTC+05:30', 'IND', '356'),
  ('ID', 'Indonesia', 'Republic of Indonesia', 'Asia', 'South-Eastern Asia', 273523621, -5, 120, '🇮🇩', 'https://flagcdn.com/id.svg', 'Jakarta', 1904569, 'Indonesian', 'IDR', 'UTC+07:00, UTC+08:00, UTC+09:00', 'IDN', '360'),
  ('PK', 'Pakistan', 'Islamic Republic of Pakistan', 'Asia', 'Southern Asia', 220892331, 30, 70, '🇵🇰', 'https://flagcdn.com/pk.svg', 'Islamabad', 881912, 'English, Urdu', 'PKR', 'UTC+05:00', 'PAK', '586'),
  ('BR', 'Brazil', 'Federative Republic of Brazil', 'Americas', 'South America', 212559409, -10, -55, '🇧🇷', 'https://flagcdn.com/br.svg', 'Brasília', 8515767, 'Portuguese', 'BRL', 'UTC-05:00, UTC-04:00, UTC-03:00, UTC-02:00', 'BRA', '076'),
  ('NG', 'Nigeria', 'Federal Republic of Nigeria', 'Africa', 'Western Africa', 206139587, 10, 8, '🇳🇬', 'https://flagcdn.com/ng.svg', 'Abuja', 923768, 'English', 'NGN', 'UTC+01:00', 'NGA', '566'),
  ('BD', 'Bangladesh', 'People''s Republic of Bangladesh', 'Asia', 'Southern Asia', 164689383, 24, 90, '🇧🇩', 'https://flagcdn.com/bd.svg', 'Dhaka', 147570, 'Bengali', 'BDT', 'UTC+06:00', 'BGD', '050'),
  ('RU', 'Russia', 'Russian Federation', 'Europe', 'Eastern Europe', 144104080, 60, 100, '🇷🇺', 'https://flagcdn.com/ru.svg', 'Moscow', 17098242, 'Russian', 'RUB', 'UTC+03:00, UTC+04:00, UTC+06:00, UTC+07:00, UTC+08:00, UTC+09:00, UTC+10:00, UTC+11:00, UTC+12:00', 'RUS', '643'),
  ('MX', 'Mexico', 'United Mexican States', 'Americas', 'North America', 128932753, 23, -102, '🇲🇽', 'https://flagcdn.com/mx.svg', 'Mexico City', 1964375, 'Spanish', 'MXN', 'UTC-08:00, UTC-07:00, UTC-06:00', 'MEX', '484'),
  ('JP', 'Japan', 'Japan', 'Asia', 'Eastern Asia', 125836021, 36, 138, '🇯🇵', 'https://flagcdn.com/jp.svg', 'Tokyo', 377930, 'Japanese', 'JPY', 'UTC+09:00', 'JPN', '392'),
  ('ET', 'Ethiopia', 'Federal Democratic Republic of Ethiopia', 'Africa', 'Eastern Africa', 114963583, 8, 38, '🇪🇹', 'https://flagcdn.com/et.svg', 'Addis Ababa', 1104300, 'Amharic', 'ETB', 'UTC+03:00', 'ETH', '231'),
  ('PH', 'Philippines', 'Republic of the Philippines', 'Asia', 'South-Eastern Asia', 109581085, 13, 122, '🇵🇭', 'https://flagcdn.com/ph.svg', 'Manila', 342353, 'English, Filipino', 'PHP', 'UTC+08:00', 'PHL', '608'),
  ('EG', 'Egypt', 'Arab Republic of Egypt', 'Africa', 'Northern Africa', 102334403, 27, 30, '🇪🇬', 'https://flagcdn.com/eg.svg', 'Cairo', 1002450, 'Arabic', 'EGP', 'UTC+02:00', 'EGY', '818'),
  ('VN', 'Vietnam', 'Socialist Republic of Vietnam', 'Asia', 'South-Eastern Asia', 97338583, 16.16666666, 107.83333333, '🇻🇳', 'https://flagcdn.com/vn.svg', 'Hanoi', 331212, 'Vietnamese', 'VND', 'UTC+07:00', 'VNM', '704'),
  ('CD', 'DR Congo', 'Democratic Republic of the Congo', 'Africa', 'Middle Africa', 108407721, NULL, 25, '🇨🇩', 'https://flagcdn.com/cd.svg', 'Kinshasa', 2344858, 'French, Kikongo, Lingala, Tshiluba, Swahili', 'CDF', 'UTC+01:00, UTC+02:00', 'COD', '180'),
  ('TR', 'Turkey', 'Republic of Turkey', 'Asia', 'Western Asia', 84339067, 39, 35, '🇹🇷', 'https://flagcdn.com/tr.svg', 'Ankara', 783562, 'Turkish', 'TRY', 'UTC+03:00', 'TUR', '792'),
  ('IR', 'Iran', 'Islamic Republic of Iran', 'Asia', 'Southern Asia', 83992953, 32, 53, '🇮🇷', 'https://flagcdn.com/ir.svg', 'Tehran', 1648195, 'Persian (Farsi)', 'IRR', 'UTC+03:30', 'IRN', '364'),
  ('DE', 'Germany', 'Federal Republic of Germany', 'Europe', 'Western Europe', 83240525, 51, 9, '🇩🇪', 'https://flagcdn.com/de.svg', 'Berlin', 357114, 'German', 'EUR', 'UTC+01:00', 'DEU', '276'),
  ('TH', 'Thailand', 'Kingdom of Thailand', 'Asia', 'South-Eastern Asia', 69799978, 15, 100, '🇹🇭', 'https://flagcdn.com/th.svg', 'Bangkok', 513120, 'Thai', 'THB', 'UTC+07:00', 'THA', '764'),
  ('GB', 'United Kingdom', 'United Kingdom of Great Britain and Northern Ireland', 'Europe', 'Northern Europe', 67215293, 54, -2, '🇬🇧', 'https://flagcdn.com/gb.svg', 'London', 242900, 'English', 'GBP', 'UTC-08:00, UTC-05:00, UTC-04:00, UTC-03:00, UTC-02:00, UTC, UTC+01:00, UTC+02:00, UTC+06:00', 'GBR', '826'),
  ('FR', 'France', 'French Republic', 'Europe', 'Western Europe', 67391582, 46, 2, '🇫🇷', 'https://flagcdn.com/fr.svg', 'Paris', 551695, 'French', 'EUR', 'UTC-10:00, UTC-09:30, UTC-09:00, UTC-08:00, UTC-04:00, UTC-03:00, UTC+01:00, UTC+02:00, UTC+03:00, UTC+04:00, UTC+05:00, UTC+10:00, UTC+11:00, UTC+12:00', 'FRA', '250'),
  ('IT', 'Italy', 'Italian Republic', 'Europe', 'Southern Europe', 59554023, 42.83333333, 12.83333333, '🇮🇹', 'https://flagcdn.com/it.svg', 'Rome', 301336, 'Italian, Catalan', 'EUR', 'UTC+01:00', 'ITA', '380'),
  ('ZA', 'South Africa', 'Republic of South Africa', 'Africa', 'Southern Africa', 59308690, -29, 24, '🇿🇦', 'https://flagcdn.com/za.svg', 'Pretoria', 1221037, 'Afrikaans, English, Southern Ndebele, Northern Sotho, Southern Sotho, Swazi, Tswana, Tsonga, Venda, Xhosa, Zulu', 'ZAR', 'UTC+02:00', 'ZAF', '710'),
  ('MM', 'Myanmar', 'Republic of the Union of Myanmar', 'Asia', 'South-Eastern Asia', 54409794, 22, 98, '🇲🇲', 'https://flagcdn.com/mm.svg', 'Naypyidaw', 676578, 'Burmese', 'MMK', 'UTC+06:30', 'MMR', '104'),
  ('KE', 'Kenya', 'Republic of Kenya', 'Africa', 'Eastern Africa', 53771300, 1, 38, '🇰🇪', 'https://flagcdn.com/ke.svg', 'Nairobi', 580367, 'English, Swahili', 'KES', 'UTC+03:00', 'KEN', '404'),
  ('KR', 'South Korea', 'Republic of Korea', 'Asia', 'Eastern Asia', 51780579, 37, 127.5, '🇰🇷', 'https://flagcdn.com/kr.svg', 'Seoul', 100210, 'Korean', 'KRW', 'UTC+09:00', 'KOR', '410'),
  ('CO', 'Colombia', 'Republic of Colombia', 'Americas', 'South America', 50882884, 4, -72, '🇨🇴', 'https://flagcdn.com/co.svg', 'Bogotá', 1141748, 'Spanish', 'COP', 'UTC-05:00', 'COL', '170'),
  ('ES', 'Spain', 'Kingdom of Spain', 'Europe', 'Southern Europe', 47351567, 40, -4, '🇪🇸', 'https://flagcdn.com/es.svg', 'Madrid', 505992, 'Spanish, Catalan, Basque, Galician', 'EUR', 'UTC, UTC+01:00', 'ESP', '724'),
  ('UG', 'Uganda', 'Republic of Uganda', 'Africa', 'Eastern Africa', 45741000, 1, 32, '🇺🇬', 'https://flagcdn.com/ug.svg', 'Kampala', 241550, 'English, Swahili', 'UGX', 'UTC+03:00', 'UGA', '800'),
  ('AR', 'Argentina', 'Argentine Republic', 'Americas', 'South America', 45376763, -34, -64, '🇦🇷', 'https://flagcdn.com/ar.svg', 'Buenos Aires', 2780400, 'Guaraní, Spanish', 'ARS', 'UTC-03:00', 'ARG', '032'),
  ('DZ', 'Algeria', 'People''s Democratic Republic of Algeria', 'Africa', 'Northern Africa', 44700000, 28, 3, '🇩🇿', 'https://flagcdn.com/dz.svg', 'Algiers', 2381741, 'Arabic', 'DZD', 'UTC+01:00', 'DZA', '012'),
  ('SD', 'Sudan', 'Republic of the Sudan', 'Africa', 'Northern Africa', 43849269, 15, 30, '🇸🇩', 'https://flagcdn.com/sd.svg', 'Khartoum', 1886068, 'Arabic, English', 'SDG', 'UTC+03:00', 'SDN', '729'),
  ('UA', 'Ukraine', 'Ukraine', 'Europe', 'Eastern Europe', 44134693, 49, 32, '🇺🇦', 'https://flagcdn.com/ua.svg', 'Kyiv', 603500, 'Ukrainian', 'UAH', 'UTC+02:00', 'UKR', '804'),
  ('IQ', 'Iraq', 'Republic of Iraq', 'Asia', 'Western Asia', 40222503, 33, 44, '🇮🇶', 'https://flagcdn.com/iq.svg', 'Baghdad', 438317, 'Arabic, Aramaic, Sorani', 'IQD', 'UTC+03:00', 'IRQ', '368'),
  ('AF', 'Afghanistan', 'Islamic Republic of Afghanistan', 'Asia', 'Southern Asia', 40218234, 33, 65, '🇦🇫', 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_the_Taliban.svg', 'Kabul', 652230, 'Dari, Pashto, Turkmen', 'AFN', 'UTC+04:30', 'AFG', '004'),
  ('PL', 'Poland', 'Republic of Poland', 'Europe', 'Central Europe', 37950802, 52, 20, '🇵🇱', 'https://flagcdn.com/pl.svg', 'Warsaw', 312679, 'Polish', 'PLN', 'UTC+01:00', 'POL', '616'),
  ('CA', 'Canada', 'Canada', 'Americas', 'North America', 38005238, 60, -95, '🇨🇦', 'https://flagcdn.com/ca.svg', 'Ottawa', 9984670, 'English, French', 'CAD', 'UTC-08:00, UTC-07:00, UTC-06:00, UTC-05:00, UTC-04:00, UTC-03:30', 'CAN', '124'),
  ('MA', 'Morocco', 'Kingdom of Morocco', 'Africa', 'Northern Africa', 36910558, 32, -5, '🇲🇦', 'https://flagcdn.com/ma.svg', 'Rabat', 446550, 'Arabic, Berber', 'MAD', 'UTC', 'MAR', '504'),
  ('SA', 'Saudi Arabia', 'Kingdom of Saudi Arabia', 'Asia', 'Western Asia', 34813867, 25, 45, '🇸🇦', 'https://flagcdn.com/sa.svg', 'Riyadh', 2149690, 'Arabic', 'SAR', 'UTC+03:00', 'SAU', '682'),
  ('UZ', 'Uzbekistan', 'Republic of Uzbekistan', 'Asia', 'Central Asia', 34232050, 41, 64, '🇺🇿', 'https://flagcdn.com/uz.svg', 'Tashkent', 447400, 'Russian, Uzbek', 'UZS', 'UTC+05:00', 'UZB', '860'),
  ('PE', 'Peru', 'Republic of Peru', 'Americas', 'South America', 32971846, -10, -76, '🇵🇪', 'https://flagcdn.com/pe.svg', 'Lima', 1285216, 'Aymara, Quechua, Spanish', 'PEN', 'UTC-05:00', 'PER', '604'),
  ('AO', 'Angola', 'Republic of Angola', 'Africa', 'Middle Africa', 32866268, -12.5, 18.5, '🇦🇴', 'https://flagcdn.com/ao.svg', 'Luanda', 1246700, 'Portuguese', 'AOA', 'UTC+01:00', 'AGO', '024'),
  ('MY', 'Malaysia', 'Malaysia', 'Asia', 'South-Eastern Asia', 32365998, 2.5, 112.5, '🇲🇾', 'https://flagcdn.com/my.svg', 'Kuala Lumpur', 330803, 'English, Malay', 'MYR', 'UTC+08:00', 'MYS', '458'),
  ('MZ', 'Mozambique', 'Republic of Mozambique', 'Africa', 'Eastern Africa', 31255435, -18.25, 35, '🇲🇿', 'https://flagcdn.com/mz.svg', 'Maputo', 801590, 'Portuguese', 'MZN', 'UTC+02:00', 'MOZ', '508'),
  ('GH', 'Ghana', 'Republic of Ghana', 'Africa', 'Western Africa', 31072945, 8, -2, '🇬🇭', 'https://flagcdn.com/gh.svg', 'Accra', 238533, 'English', 'GHS', 'UTC', 'GHA', '288'),
  ('YE', 'Yemen', 'Republic of Yemen', 'Asia', 'Western Asia', 29825968, 15, 48, '🇾🇪', 'https://flagcdn.com/ye.svg', 'Sana''a', 527968, 'Arabic', 'YER', 'UTC+03:00', 'YEM', '887'),
  ('NP', 'Nepal', 'Federal Democratic Republic of Nepal', 'Asia', 'Southern Asia', 29136808, 28, 84, '🇳🇵', 'https://flagcdn.com/np.svg', 'Kathmandu', 147181, 'Nepali', 'NPR', 'UTC+05:45', 'NPL', '524'),
  ('VE', 'Venezuela', 'Bolivarian Republic of Venezuela', 'Americas', 'South America', 28435943, 8, -66, '🇻🇪', 'https://flagcdn.com/ve.svg', 'Caracas', 916445, 'Spanish', 'VES', 'UTC-04:00', 'VEN', '862'),
  ('MG', 'Madagascar', 'Republic of Madagascar', 'Africa', 'Eastern Africa', 27691019, -20, 47, '🇲🇬', 'https://flagcdn.com/mg.svg', 'Antananarivo', 587041, 'French, Malagasy', 'MGA', 'UTC+03:00', 'MDG', '450'),
  ('CI', 'Ivory Coast', 'Republic of Côte d''Ivoire', 'Africa', 'Western Africa', 26378275, 8, -5, '🇨🇮', 'https://flagcdn.com/ci.svg', 'Yamoussoukro', 322463, 'French', 'XOF', 'UTC', 'CIV', '384'),
  ('CM', 'Cameroon', 'Republic of Cameroon', 'Africa', 'Middle Africa', 26545864, 6, 12, '🇨🇲', 'https://flagcdn.com/cm.svg', 'Yaoundé', 475442, 'English, French', 'XAF', 'UTC+01:00', 'CMR', '120'),
  ('AU', 'Australia', 'Commonwealth of Australia', 'Oceania', 'Australia and New Zealand', 25687041, -27, 133, '🇦🇺', 'https://flagcdn.com/au.svg', 'Canberra', 7692024, 'English', 'AUD', 'UTC+05:00, UTC+06:30, UTC+07:00, UTC+08:00, UTC+09:30, UTC+10:00, UTC+10:30, UTC+11:30', 'AUS', '036'),
  ('KP', 'North Korea', 'Democratic People''s Republic of Korea', 'Asia', 'Eastern Asia', 25778815, 40, 127, '🇰🇵', 'https://flagcdn.com/kp.svg', 'Pyongyang', 120538, 'Korean', 'KPW', 'UTC+09:00', 'PRK', '408'),
  ('TZ', 'Tanzania', 'United Republic of Tanzania', 'Africa', 'Eastern Africa', 59734213, -6, 35, '🇹🇿', 'https://flagcdn.com/tz.svg', 'Dodoma', 945087, 'English, Swahili', 'TZS', 'UTC+03:00', 'TZA', '834'),
  ('NE', 'Niger', 'Republic of Niger', 'Africa', 'Western Africa', 24206636, 16, 8, '🇳🇪', 'https://flagcdn.com/ne.svg', 'Niamey', 1267000, 'French', 'XOF', 'UTC+01:00', 'NER', '562'),
  ('LK', 'Sri Lanka', 'Democratic Socialist Republic of Sri Lanka', 'Asia', 'Southern Asia', 21919000, 7, 81, '🇱🇰', 'https://flagcdn.com/lk.svg', 'Sri Jayawardenepura Kotte', 65610, 'Sinhala, Tamil', 'LKR', 'UTC+05:30', 'LKA', '144'),
  ('BF', 'Burkina Faso', 'Burkina Faso', 'Africa', 'Western Africa', 20903278, 13, -2, '🇧🇫', 'https://flagcdn.com/bf.svg', 'Ouagadougou', 272967, 'French', 'XOF', 'UTC', 'BFA', '854'),
  ('ML', 'Mali', 'Republic of Mali', 'Africa', 'Western Africa', 20250834, 17, -4, '🇲🇱', 'https://flagcdn.com/ml.svg', 'Bamako', 1240192, 'French', 'XOF', 'UTC', 'MLI', '466'),
  ('RO', 'Romania', 'Romania', 'Europe', 'Southeast Europe', 19286123, 46, 25, '🇷🇴', 'https://flagcdn.com/ro.svg', 'Bucharest', 238391, 'Romanian', 'RON', 'UTC+02:00', 'ROU', '642'),
  ('MW', 'Malawi', 'Republic of Malawi', 'Africa', 'Eastern Africa', 19129955, -13.5, 34, '🇲🇼', 'https://flagcdn.com/mw.svg', 'Lilongwe', 118484, 'English, Chewa', 'MWK', 'UTC+02:00', 'MWI', '454'),
  ('CL', 'Chile', 'Republic of Chile', 'Americas', 'South America', 19116209, -30, -71, '🇨🇱', 'https://flagcdn.com/cl.svg', 'Santiago', 756102, 'Spanish', 'CLP', 'UTC-06:00, UTC-04:00', 'CHL', '152'),
  ('KZ', 'Kazakhstan', 'Republic of Kazakhstan', 'Asia', 'Central Asia', 18754440, 48.0196, 66.9237, '🇰🇿', 'https://flagcdn.com/kz.svg', 'Astana', 2724900, 'Kazakh, Russian', 'KZT', 'UTC+05:00, UTC+06:00', 'KAZ', '398'),
  ('ZM', 'Zambia', 'Republic of Zambia', 'Africa', 'Eastern Africa', 18383956, -15, 30, '🇿🇲', 'https://flagcdn.com/zm.svg', 'Lusaka', 752612, 'English', 'ZMW', 'UTC+02:00', 'ZMB', '894'),
  ('SY', 'Syria', 'Syrian Arab Republic', 'Asia', 'Western Asia', 17500657, 35, 38, '🇸🇾', 'https://flagcdn.com/sy.svg', 'Damascus', 185180, 'Arabic', 'SYP', 'UTC+02:00', 'SYR', '760'),
  ('EC', 'Ecuador', 'Republic of Ecuador', 'Americas', 'South America', 17643060, -2, -77.5, '🇪🇨', 'https://flagcdn.com/ec.svg', 'Quito', 276841, 'Spanish', 'USD', 'UTC-06:00, UTC-05:00', 'ECU', '218'),
  ('KH', 'Cambodia', 'Kingdom of Cambodia', 'Asia', 'South-Eastern Asia', 16718971, 13, 105, '🇰🇭', 'https://flagcdn.com/kh.svg', 'Phnom Penh', 181035, 'Khmer', 'KHR, USD', 'UTC+07:00', 'KHM', '116'),
  ('GT', 'Guatemala', 'Republic of Guatemala', 'Americas', 'Central America', 16858333, 15.5, -90.25, '🇬🇹', 'https://flagcdn.com/gt.svg', 'Guatemala City', 108889, 'Spanish', 'GTQ', 'UTC-06:00', 'GTM', '320'),
  ('NL', 'Netherlands', 'Kingdom of the Netherlands', 'Europe', 'Western Europe', 16655799, 52.5, 5.75, '🇳🇱', 'https://flagcdn.com/nl.svg', 'Amsterdam', 41850, 'Dutch', 'EUR', 'UTC+01:00', 'NLD', '528'),
  ('SO', 'Somalia', 'Federal Republic of Somalia', 'Africa', 'Eastern Africa', 15893219, 10, 49, '🇸🇴', 'https://flagcdn.com/so.svg', 'Mogadishu', 637657, 'Arabic, Somali', 'SOS', 'UTC+03:00', 'SOM', '706'),
  ('ZW', 'Zimbabwe', 'Republic of Zimbabwe', 'Africa', 'Southern Africa', 14862927, -20, 30, '🇿🇼', 'https://flagcdn.com/zw.svg', 'Harare', 390757, 'Chibarwe, English, Kalanga, Khoisan, Ndau, Northern Ndebele, Chewa, Shona, Sotho, Tonga, Tswana, Tsonga, Venda, Xhosa, Zimbabwean Sign Language', 'ZWL', 'UTC+02:00', 'ZWE', '716'),
  ('GN', 'Guinea', 'Republic of Guinea', 'Africa', 'Western Africa', 13132792, 11, -10, '🇬🇳', 'https://flagcdn.com/gn.svg', 'Conakry', 245857, 'French', 'GNF', 'UTC', 'GIN', '324'),
  ('BJ', 'Benin', 'Republic of Benin', 'Africa', 'Western Africa', 12123198, 9.5, 2.25, '🇧🇯', 'https://flagcdn.com/bj.svg', 'Porto-Novo', 112622, 'French', 'XOF', 'UTC+01:00', 'BEN', '204'),
  ('BI', 'Burundi', 'Republic of Burundi', 'Africa', 'Eastern Africa', 11890781, -3.5, 30, '🇧🇮', 'https://flagcdn.com/bi.svg', 'Gitega', 27834, 'French, Kirundi', 'BIF', 'UTC+02:00', 'BDI', '108'),
  ('BO', 'Bolivia', 'Plurinational State of Bolivia', 'Americas', 'South America', 11673029, -17, -65, '🇧🇴', 'https://flagcdn.com/bo.svg', 'Sucre', 1098581, 'Aymara, Guaraní, Quechua, Spanish', 'BOB', 'UTC-04:00', 'BOL', '068'),
  ('BE', 'Belgium', 'Kingdom of Belgium', 'Europe', 'Western Europe', 11555997, 50.83333333, 4, '🇧🇪', 'https://flagcdn.com/be.svg', 'Brussels', 30528, 'German, French, Dutch', 'EUR', 'UTC+01:00', 'BEL', '056'),
  ('HT', 'Haiti', 'Republic of Haiti', 'Americas', 'Caribbean', 11402533, 19, -72.41666666, '🇭🇹', 'https://flagcdn.com/ht.svg', 'Port-au-Prince', 27750, 'French, Haitian Creole', 'HTG', 'UTC-05:00', 'HTI', '332'),
  ('CU', 'Cuba', 'Republic of Cuba', 'Americas', 'Caribbean', 11326616, 21.5, -80, '🇨🇺', 'https://flagcdn.com/cu.svg', 'Havana', 109884, 'Spanish', 'CUC, CUP', 'UTC-05:00', 'CUB', '192'),
  ('TN', 'Tunisia', 'Tunisian Republic', 'Africa', 'Northern Africa', 11818618, 34, 9, '🇹🇳', 'https://flagcdn.com/tn.svg', 'Tunis', 163610, 'Arabic', 'TND', 'UTC+01:00', 'TUN', '788'),
  ('SS', 'South Sudan', 'Republic of South Sudan', 'Africa', 'Middle Africa', 11193729, 7, 30, '🇸🇸', 'https://flagcdn.com/ss.svg', 'Juba', 619745, 'English', 'SSP', 'UTC+03:00', 'SSD', '728'),
  ('DO', 'Dominican Republic', 'Dominican Republic', 'Americas', 'Caribbean', 10847904, 19, -70.66666666, '🇩🇴', 'https://flagcdn.com/do.svg', 'Santo Domingo', 48671, 'Spanish', 'DOP', 'UTC-04:00', 'DOM', '214'),
  ('CZ', 'Czechia', 'Czech Republic', 'Europe', 'Central Europe', 10698896, 49.75, 15.5, '🇨🇿', 'https://flagcdn.com/cz.svg', 'Prague', 78865, 'Czech, Slovak', 'CZK', 'UTC+01:00', 'CZE', '203'),
  ('GR', 'Greece', 'Hellenic Republic', 'Europe', 'Southern Europe', 10715549, 39, 22, '🇬🇷', 'https://flagcdn.com/gr.svg', 'Athens', 131990, 'Greek', 'EUR', 'UTC+02:00', 'GRC', '300'),
  ('SE', 'Sweden', 'Kingdom of Sweden', 'Europe', 'Northern Europe', 10353442, 62, 15, '🇸🇪', 'https://flagcdn.com/se.svg', 'Stockholm', 450295, 'Swedish', 'SEK', 'UTC+01:00', 'SWE', '752'),
  ('PT', 'Portugal', 'Portuguese Republic', 'Europe', 'Southern Europe', 10305564, 39.5, -8, '🇵🇹', 'https://flagcdn.com/pt.svg', 'Lisbon', 92090, 'Portuguese', 'EUR', 'UTC-01:00, UTC', 'PRT', '620'),
  ('JO', 'Jordan', 'Hashemite Kingdom of Jordan', 'Asia', 'Western Asia', 10203140, 31, 36, '🇯🇴', 'https://flagcdn.com/jo.svg', 'Amman', 89342, 'Arabic', 'JOD', 'UTC+03:00', 'JOR', '400'),
  ('AZ', 'Azerbaijan', 'Republic of Azerbaijan', 'Asia', 'Western Asia', 10110116, 40.5, 47.5, '🇦🇿', 'https://flagcdn.com/az.svg', 'Baku', 86600, 'Azerbaijani', 'AZN', 'UTC+04:00', 'AZE', '031'),
  ('HU', 'Hungary', 'Hungary', 'Europe', 'Central Europe', 9749763, 47, 20, '🇭🇺', 'https://flagcdn.com/hu.svg', 'Budapest', 93028, 'Hungarian', 'HUF', 'UTC+01:00', 'HUN', '348'),
  ('HN', 'Honduras', 'Republic of Honduras', 'Americas', 'Central America', 9904608, 15, -86.5, '🇭🇳', 'https://flagcdn.com/hn.svg', 'Tegucigalpa', 112492, 'Spanish', 'HNL', 'UTC-06:00', 'HND', '340'),
  ('AE', 'United Arab Emirates', 'United Arab Emirates', 'Asia', 'Western Asia', 9890400, 24, 54, '🇦🇪', 'https://flagcdn.com/ae.svg', 'Abu Dhabi', 83600, 'Arabic', 'AED', 'UTC+04:00', 'ARE', '784'),
  ('BY', 'Belarus', 'Republic of Belarus', 'Europe', 'Eastern Europe', 9398861, 53, 28, '🇧🇾', 'https://flagcdn.com/by.svg', 'Minsk', 207600, 'Belarusian, Russian', 'BYN', 'UTC+03:00', 'BLR', '112'),
  ('IL', 'Israel', 'State of Israel', 'Asia', 'Western Asia', 9216900, 31.47, 35.13, '🇮🇱', 'https://flagcdn.com/il.svg', 'Jerusalem', 20770, 'Arabic, Hebrew', 'ILS', 'UTC+02:00', 'ISR', '376'),
  ('PG', 'Papua New Guinea', 'Independent State of Papua New Guinea', 'Oceania', 'Melanesia', 8947027, -6, 147, '🇵🇬', 'https://flagcdn.com/pg.svg', 'Port Moresby', 462840, 'English, Hiri Motu, Tok Pisin', 'PGK', 'UTC+10:00', 'PNG', '598'),
  ('AT', 'Austria', 'Republic of Austria', 'Europe', 'Central Europe', 8917205, 47.33333333, 13.33333333, '🇦🇹', 'https://flagcdn.com/at.svg', 'Vienna', 83871, 'German', 'EUR', 'UTC+01:00', 'AUT', '040'),
  ('CH', 'Switzerland', 'Swiss Confederation', 'Europe', 'Western Europe', 8654622, 47, 8, '🇨🇭', 'https://flagcdn.com/ch.svg', 'Bern', 41284, 'French, Swiss German, Italian, Romansh', 'CHF', 'UTC+01:00', 'CHE', '756'),
  ('TG', 'Togo', 'Togolese Republic', 'Africa', 'Western Africa', 8278737, 8, 1.16666666, '🇹🇬', 'https://flagcdn.com/tg.svg', 'Lomé', 56785, 'French', 'XOF', 'UTC', 'TGO', '768'),
  ('SL', 'Sierra Leone', 'Republic of Sierra Leone', 'Africa', 'Western Africa', 7976985, 8.5, -11.5, '🇸🇱', 'https://flagcdn.com/sl.svg', 'Freetown', 71740, 'English', 'SLE', 'UTC', 'SLE', '694'),
  ('LA', 'Laos', 'Lao People''s Democratic Republic', 'Asia', 'South-Eastern Asia', 7275556, 18, 105, '🇱🇦', 'https://flagcdn.com/la.svg', 'Vientiane', 236800, 'Lao', 'LAK', 'UTC+07:00', 'LAO', '418'),
  ('PY', 'Paraguay', 'Republic of Paraguay', 'Americas', 'South America', 7132530, -23, -58, '🇵🇾', 'https://flagcdn.com/py.svg', 'Asunción', 406752, 'Guaraní, Spanish', 'PYG', 'UTC-04:00', 'PRY', '600'),
  ('BG', 'Bulgaria', 'Republic of Bulgaria', 'Europe', 'Southeast Europe', 6927288, 43, 25, '🇧🇬', 'https://flagcdn.com/bg.svg', 'Sofia', 110879, 'Bulgarian', 'BGN', 'UTC+02:00', 'BGR', '100'),
  ('RS', 'Serbia', 'Republic of Serbia', 'Europe', 'Southeast Europe', 6908224, 44, 21, '🇷🇸', 'https://flagcdn.com/rs.svg', 'Belgrade', 88361, 'Serbian', 'RSD', 'UTC+01:00', 'SRB', '688'),
  ('LB', 'Lebanon', 'Lebanese Republic', 'Asia', 'Western Asia', 6825442, 33.83333333, 35.83333333, '🇱🇧', 'https://flagcdn.com/lb.svg', 'Beirut', 10452, 'Arabic, French', 'LBP', 'UTC+02:00', 'LBN', '422'),
  ('NI', 'Nicaragua', 'Republic of Nicaragua', 'Americas', 'Central America', 6624554, 13, -85, '🇳🇮', 'https://flagcdn.com/ni.svg', 'Managua', 130373, 'Spanish', 'NIO', 'UTC-06:00', 'NIC', '558'),
  ('KG', 'Kyrgyzstan', 'Kyrgyz Republic', 'Asia', 'Central Asia', 6591600, 41, 75, '🇰🇬', 'https://flagcdn.com/kg.svg', 'Bishkek', 199951, 'Kyrgyz, Russian', 'KGS', 'UTC+06:00', 'KGZ', '417'),
  ('SV', 'El Salvador', 'Republic of El Salvador', 'Americas', 'Central America', 6486201, 13.83333333, -88.91666666, '🇸🇻', 'https://flagcdn.com/sv.svg', 'San Salvador', 21041, 'Spanish', 'USD', 'UTC-06:00', 'SLV', '222'),
  ('TJ', 'Tajikistan', 'Republic of Tajikistan', 'Asia', 'Central Asia', 9537642, 39, 71, '🇹🇯', 'https://flagcdn.com/tj.svg', 'Dushanbe', 143100, 'Russian, Tajik', 'TJS', 'UTC+05:00', 'TJK', '762'),
  ('DK', 'Denmark', 'Kingdom of Denmark', 'Europe', 'Northern Europe', 5831404, 56, 10, '🇩🇰', 'https://flagcdn.com/dk.svg', 'Copenhagen', 43094, 'Danish', 'DKK', 'UTC-04:00, UTC-03:00, UTC-01:00, UTC, UTC+01:00', 'DNK', '208'),
  ('SG', 'Singapore', 'Republic of Singapore', 'Asia', 'South-Eastern Asia', 5685807, 1.36666666, 103.8, '🇸🇬', 'https://flagcdn.com/sg.svg', 'Singapore', 710, 'English, Chinese, Malay, Tamil', 'SGD', 'UTC+08:00', 'SGP', '702'),
  ('FI', 'Finland', 'Republic of Finland', 'Europe', 'Northern Europe', 5530719, 64, 26, '🇫🇮', 'https://flagcdn.com/fi.svg', 'Helsinki', 338424, 'Finnish, Swedish', 'EUR', 'UTC+02:00', 'FIN', '246'),
  ('SK', 'Slovakia', 'Slovak Republic', 'Europe', 'Central Europe', 5458827, 48.66666666, 19.5, '🇸🇰', 'https://flagcdn.com/sk.svg', 'Bratislava', 49037, 'Slovak', 'EUR', 'UTC+01:00', 'SVK', '703'),
  ('NO', 'Norway', 'Kingdom of Norway', 'Europe', 'Northern Europe', 5379475, 62, 10, '🇳🇴', 'https://flagcdn.com/no.svg', 'Oslo', 323802, 'Norwegian Nynorsk, Norwegian Bokmål, Sami', 'NOK', 'UTC+01:00', 'NOR', '578'),
  ('ER', 'Eritrea', 'State of Eritrea', 'Africa', 'Eastern Africa', 5352000, 15, 39, '🇪🇷', 'https://flagcdn.com/er.svg', 'Asmara', 117600, 'Arabic, English, Tigrinya', 'ERN', 'UTC+03:00', 'ERI', '232'),
  ('OM', 'Oman', 'Sultanate of Oman', 'Asia', 'Western Asia', 5106622, 21, 57, '🇴🇲', 'https://flagcdn.com/om.svg', 'Muscat', 309500, 'Arabic', 'OMR', 'UTC+04:00', 'OMN', '512'),
  ('NZ', 'New Zealand', 'New Zealand', 'Oceania', 'Australia and New Zealand', 5084300, -41, 174, '🇳🇿', 'https://flagcdn.com/nz.svg', 'Wellington', 270467, 'English, Māori, New Zealand Sign Language', 'NZD', 'UTC-11:00, UTC-10:00, UTC+12:00, UTC+12:45, UTC+13:00', 'NZL', '554'),
  ('CR', 'Costa Rica', 'Republic of Costa Rica', 'Americas', 'Central America', 5094114, 10, -84, '🇨🇷', 'https://flagcdn.com/cr.svg', 'San José', 51100, 'Spanish', 'CRC', 'UTC-06:00', 'CRI', '188'),
  ('LR', 'Liberia', 'Republic of Liberia', 'Africa', 'Western Africa', 5057677, 6.5, -9.5, '🇱🇷', 'https://flagcdn.com/lr.svg', 'Monrovia', 111369, 'English', 'LRD', 'UTC', 'LBR', '430'),
  ('IE', 'Ireland', 'Republic of Ireland', 'Europe', 'Northern Europe', 4994724, 53, -8, '🇮🇪', 'https://flagcdn.com/ie.svg', 'Dublin', 70273, 'English, Irish', 'EUR', 'UTC', 'IRL', '372'),
  ('CF', 'Central African Republic', 'Central African Republic', 'Africa', 'Middle Africa', 4829764, 7, 21, '🇨🇫', 'https://flagcdn.com/cf.svg', 'Bangui', 622984, 'French, Sango', 'XAF', 'UTC+01:00', 'CAF', '140'),
  ('MR', 'Mauritania', 'Islamic Republic of Mauritania', 'Africa', 'Western Africa', 4649660, 20, -12, '🇲🇷', 'https://flagcdn.com/mr.svg', 'Nouakchott', 1030700, 'Arabic', 'MRU', 'UTC', 'MRT', '478'),
  ('PA', 'Panama', 'Republic of Panama', 'Americas', 'Central America', 4314768, 9, -80, '🇵🇦', 'https://flagcdn.com/pa.svg', 'Panama City', 75417, 'Spanish', 'PAB, USD', 'UTC-05:00', 'PAN', '591'),
  ('KW', 'Kuwait', 'State of Kuwait', 'Asia', 'Western Asia', 4270563, 29.5, 45.75, '🇰🇼', 'https://flagcdn.com/kw.svg', 'Kuwait City', 17818, 'Arabic', 'KWD', 'UTC+03:00', 'KWT', '414'),
  ('HR', 'Croatia', 'Republic of Croatia', 'Europe', 'Southeast Europe', 4047200, 45.16666666, 15.5, '🇭🇷', 'https://flagcdn.com/hr.svg', 'Zagreb', 56594, 'Croatian', 'EUR', 'UTC+01:00', 'HRV', '191'),
  ('GE', 'Georgia', 'Georgia', 'Asia', 'Western Asia', 3714000, 42, 43.5, '🇬🇪', 'https://flagcdn.com/ge.svg', 'Tbilisi', 69700, 'Georgian', 'GEL', 'UTC+04:00', 'GEO', '268'),
  ('UY', 'Uruguay', 'Oriental Republic of Uruguay', 'Americas', 'South America', 3473727, -33, -56, '🇺🇾', 'https://flagcdn.com/uy.svg', 'Montevideo', 181034, 'Spanish', 'UYU', 'UTC-03:00', 'URY', '858'),
  ('BA', 'Bosnia and Herzegovina', 'Bosnia and Herzegovina', 'Europe', 'Southeast Europe', 3280815, 44, 18, '🇧🇦', 'https://flagcdn.com/ba.svg', 'Sarajevo', 51209, 'Bosnian, Croatian, Serbian', 'BAM', 'UTC+01:00', 'BIH', '070'),
  ('MN', 'Mongolia', 'Mongolia', 'Asia', 'Eastern Asia', 3278292, 46, 105, '🇲🇳', 'https://flagcdn.com/mn.svg', 'Ulan Bator', 1564110, 'Mongolian', 'MNT', 'UTC+07:00, UTC+08:00', 'MNG', '496'),
  ('AM', 'Armenia', 'Republic of Armenia', 'Asia', 'Western Asia', 2963234, 40, 45, '🇦🇲', 'https://flagcdn.com/am.svg', 'Yerevan', 29743, 'Armenian', 'AMD', 'UTC+04:00', 'ARM', '051'),
  ('JM', 'Jamaica', 'Jamaica', 'Americas', 'Caribbean', 2961161, 18.25, -77.5, '🇯🇲', 'https://flagcdn.com/jm.svg', 'Kingston', 10991, 'English, Jamaican Patois', 'JMD', 'UTC-05:00', 'JAM', '388'),
  ('QA', 'Qatar', 'State of Qatar', 'Asia', 'Western Asia', 2881060, 25.5, 51.25, '🇶🇦', 'https://flagcdn.com/qa.svg', 'Doha', 11586, 'Arabic', 'QAR', 'UTC+03:00', 'QAT', '634'),
  ('AL', 'Albania', 'Republic of Albania', 'Europe', 'Southeast Europe', 2837743, 41, 20, '🇦🇱', 'https://flagcdn.com/al.svg', 'Tirana', 28748, 'Albanian', 'ALL', 'UTC+01:00', 'ALB', '008'),
  ('LV', 'Latvia', 'Republic of Latvia', 'Europe', 'Northern Europe', 1901548, 57, 25, '🇱🇻', 'https://flagcdn.com/lv.svg', 'Riga', 64559, 'Latvian', 'EUR', 'UTC+02:00', 'LVA', '428'),
  ('LT', 'Lithuania', 'Republic of Lithuania', 'Europe', 'Northern Europe', 2794700, 56, 24, '🇱🇹', 'https://flagcdn.com/lt.svg', 'Vilnius', 65300, 'Lithuanian', 'EUR', 'UTC+02:00', 'LTU', 'LT'),
  ('MD', 'Moldova', 'Republic of Moldova', 'Europe', 'Eastern Europe', 2617820, 47, 29, '🇲🇩', 'https://flagcdn.com/md.svg', 'Chișinău', 33846, 'Romanian', 'MDL', 'UTC+02:00', 'MDA', '498'),
  ('NA', 'Namibia', 'Republic of Namibia', 'Africa', 'Southern Africa', 2540916, -22, 17, '🇳🇦', 'https://flagcdn.com/na.svg', 'Windhoek', 825615, 'Afrikaans, German, English, Herero, Khoekhoe, Kwangali, Lozi, Ndonga, Tswana', 'NAD, ZAR', 'UTC+01:00', 'NAM', '516');

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