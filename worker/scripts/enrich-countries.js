#!/usr/bin/env node

/**
 * Country Enrichment Script for Flare360
 * 
 * This script fetches comprehensive country data from the REST Countries API
 * and populates the enhanced countries table in D1 database.
 * 
 * Usage:
 * node scripts/enrich-countries.js [--env production|staging|dev] [--dry-run]
 */

import https from 'https';
import { execSync } from 'child_process';

// Configuration
const REST_COUNTRIES_API = 'https://restcountries.com/v3.1/independent?status=true';
// Updated field list based on REST Countries API v3.1 documentation  
const FIELDS = 'name,cca2,cca3,ccn3,region,subregion,population,latlng,flag,flags,capital,area,languages,currencies,timezones';

// Command line arguments
const args = process.argv.slice(2);
const env = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'dev';
const isDryRun = args.includes('--dry-run');

console.log(`🌍 Starting country enrichment for ${env} environment`);
console.log(`📊 Dry run mode: ${isDryRun ? 'ON' : 'OFF'}`);

// Country name mappings for existing disasters
const COUNTRY_MAPPINGS = {
  // Common mappings from disaster data to ISO-2 codes
  'United States': 'US',
  'United Kingdom': 'GB',
  'Russia': 'RU',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Papua New Guinea': 'PG',
  'New Zealand': 'NZ',
  'South Africa': 'ZA',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
  'China': 'CN',
  'Japan': 'JP',
  'India': 'IN',
  'Myanmar': 'MM',
  'Burma': 'MM', // Alternative name for Myanmar
  'Democratic Republic of the Congo': 'CD',
  'Congo': 'CG',
  'Ivory Coast': 'CI',
  'Côte d\'Ivoire': 'CI',
  'Iran': 'IR',
  'North Korea': 'KP',
  'South Korea': 'KR',
  'Vietnam': 'VN',
  'Laos': 'LA',
  'Thailand': 'TH',
  'Malaysia': 'MY',
  'Singapore': 'SG',
  'Brunei': 'BN',
  'Cambodia': 'KH',
  'Taiwan': 'TW',
  'Hong Kong': 'HK',
  'Macau': 'MO',
  'Macao': 'MO',
  // ISO-2 codes that should remain as-is
  'RU': 'RU',
  'ID': 'ID',
  'PH': 'PH',
  'PG': 'PG',
  'AU': 'AU',
  'BR': 'BR',
  'ZM': 'ZM',
  'CL': 'CL',
  'PE': 'PE',
  'EC': 'EC',
  'NG': 'NG',
  'ZA': 'ZA',
  'KE': 'KE',
  'ET': 'ET',
  'SD': 'SD',
  'EG': 'EG',
  'DZ': 'DZ',
  'MA': 'MA',
  'LY': 'LY',
  'TN': 'TN',
  'MX': 'MX',
  'GT': 'GT',
  'HN': 'HN',
  'NI': 'NI',
  'CR': 'CR',
  'PA': 'PA',
  'CO': 'CO',
  'VE': 'VE',
  'GY': 'GY',
  'SR': 'SR',
  'GF': 'GF',
  'BO': 'BO',
  'PY': 'PY',
  'UY': 'UY',
  'AR': 'AR',
  'FK': 'FK',
  'GS': 'GS',
  'US': 'US',
  'CA': 'CA',
  'GL': 'GL',
  'IS': 'IS',
  'NO': 'NO',
  'SE': 'SE',
  'FI': 'FI',
  'DK': 'DK',
  'DE': 'DE',
  'NL': 'NL',
  'BE': 'BE',
  'LU': 'LU',
  'FR': 'FR',
  'CH': 'CH',
  'AT': 'AT',
  'LI': 'LI',
  'IT': 'IT',
  'VA': 'VA',
  'SM': 'SM',
  'MT': 'MT',
  'ES': 'ES',
  'AD': 'AD',
  'PT': 'PT',
  'GB': 'GB',
  'IE': 'IE',
  'IM': 'IM',
  'GG': 'GG',
  'JE': 'JE',
  'PL': 'PL',
  'CZ': 'CZ',
  'SK': 'SK',
  'HU': 'HU',
  'SI': 'SI',
  'HR': 'HR',
  'BA': 'BA',
  'RS': 'RS',
  'ME': 'ME',
  'XK': 'XK',
  'AL': 'AL',
  'MK': 'MK',
  'BG': 'BG',
  'RO': 'RO',
  'MD': 'MD',
  'UA': 'UA',
  'BY': 'BY',
  'LT': 'LT',
  'LV': 'LV',
  'EE': 'EE',
  'GR': 'GR',
  'CY': 'CY',
  'TR': 'TR',
  'GE': 'GE',
  'AM': 'AM',
  'AZ': 'AZ',
  'KZ': 'KZ',
  'KG': 'KG',
  'TJ': 'TJ',
  'UZ': 'UZ',
  'TM': 'TM',
  'AF': 'AF',
  'PK': 'PK',
  'IN': 'IN',
  'LK': 'LK',
  'MV': 'MV',
  'BD': 'BD',
  'BT': 'BT',
  'NP': 'NP',
  'CN': 'CN',
  'MN': 'MN',
  'KP': 'KP',
  'KR': 'KR',
  'JP': 'JP',
  'TW': 'TW',
  'HK': 'HK',
  'MO': 'MO',
  'VN': 'VN',
  'LA': 'LA',
  'TH': 'TH',
  'KH': 'KH',
  'MY': 'MY',
  'SG': 'SG',
  'BN': 'BN',
  'MM': 'MM',
  'ID': 'ID',
  'TL': 'TL',
  'PH': 'PH',
  'PG': 'PG',
  'SB': 'SB',
  'VU': 'VU',
  'NC': 'NC',
  'FJ': 'FJ',
  'NZ': 'NZ',
  'AU': 'AU'
};

/**
 * Fetch country data from REST Countries API
 */
async function fetchCountryData() {
  console.log('🔍 Fetching country data from REST Countries API...');
  
  return new Promise((resolve, reject) => {
    const url = REST_COUNTRIES_API; // Fetch all fields for now
    console.log(`📡 Requesting: ${url}`);
    
    https.get(url, (res) => {
      console.log(`📊 HTTP Status: ${res.statusCode}`);
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: Failed to fetch country data`));
        return;
      }
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const countries = JSON.parse(data);
          if (!Array.isArray(countries)) {
            reject(new Error(`Expected array of countries, got: ${typeof countries}`));
            return;
          }
          console.log(`✅ Fetched ${countries.length} countries from REST Countries API`);
          resolve(countries);
        } catch (error) {
          reject(new Error(`Failed to parse country data: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Failed to fetch country data: ${error.message}`));
    });
  });
}

/**
 * Transform country data for database insertion
 */
function transformCountryData(countries) {
  console.log('🔄 Transforming country data...');
  
  return countries.map(country => {
    const commonName = country.name?.common || '';
    const officialName = country.name?.official || commonName;
    const region = country.region || null;
    const subregion = country.subregion || null;
    const population = country.population || null;
    const lat = country.latlng?.[0] || null;
    const lng = country.latlng?.[1] || null;
    const flag = country.flag || null;
    const flagUrl = country.flags?.svg || country.flags?.png || null;
    const capital = Array.isArray(country.capital) ? country.capital[0] : country.capital || null;
    const area = country.area || null;
    const languages = country.languages ? Object.values(country.languages).join(', ') : null;
    const currencies = country.currencies ? Object.keys(country.currencies).join(', ') : null;
    const timezones = Array.isArray(country.timezones) ? country.timezones.join(', ') : country.timezones || null;
    
    return {
      code: country.cca2,
      name: commonName,
      official_name: officialName,
      region,
      subregion,
      population,
      coordinates_lat: lat,
      coordinates_lng: lng,
      flag,
      flag_url: flagUrl,
      capital,
      area,
      languages,
      currencies,
      timezones,
      iso3: country.cca3 || null,
      numeric_code: country.ccn3 || null
    };
  });
}

/**
 * Execute SQL command using wrangler
 */
function executeSQL(sql, description) {
  const envFlag = env !== 'dev' ? `--env ${env}` : '';
  const command = `wrangler d1 execute dcom360-db ${envFlag} --remote --command "${sql.replace(/"/g, '\\"')}"`;
  
  if (isDryRun) {
    console.log(`🔍 [DRY RUN] ${description}`);
    console.log(`📝 SQL: ${sql}`);
    return { success: true };
  }
  
  try {
    console.log(`⚡ ${description}`);
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    console.error(`❌ Failed to ${description}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Insert or update country data in batches
 */
function insertCountryData(countries) {
  console.log(`📝 Inserting ${countries.length} countries into database...`);
  
  const BATCH_SIZE = 50; // Process in batches to avoid SQL length limits
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < countries.length; i += BATCH_SIZE) {
    const batch = countries.slice(i, i + BATCH_SIZE);
    
    // Create INSERT OR REPLACE statement
    const values = batch.map(country => {
      const escapedValues = [
        `'${country.code}'`,
        `'${(country.name || '').replace(/'/g, "''")}'`,
        `'${(country.official_name || '').replace(/'/g, "''")}'`,
        country.region ? `'${country.region.replace(/'/g, "''")}'` : 'NULL',
        country.subregion ? `'${country.subregion.replace(/'/g, "''")}'` : 'NULL',
        country.population || 'NULL',
        country.coordinates_lat || 'NULL',
        country.coordinates_lng || 'NULL',
        country.flag ? `'${country.flag}'` : 'NULL',
        country.flag_url ? `'${country.flag_url.replace(/'/g, "''")}'` : 'NULL',
        country.capital ? `'${country.capital.replace(/'/g, "''")}'` : 'NULL',
        country.area || 'NULL',
        country.languages ? `'${country.languages.replace(/'/g, "''")}'` : 'NULL',
        country.currencies ? `'${country.currencies.replace(/'/g, "''")}'` : 'NULL',
        country.timezones ? `'${country.timezones.replace(/'/g, "''")}'` : 'NULL',
        country.iso3 ? `'${country.iso3}'` : 'NULL',
        country.numeric_code ? `'${country.numeric_code}'` : 'NULL'
      ];
      
      return `(${escapedValues.join(', ')})`;
    }).join(', ');
    
    const sql = `INSERT OR REPLACE INTO countries (
      code, name, official_name, region, subregion, population,
      coordinates_lat, coordinates_lng, flag, flag_url, capital,
      area, languages, currencies, timezones, iso3, numeric_code
    ) VALUES ${values}`;
    
    const result = executeSQL(sql, `Inserting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(countries.length/BATCH_SIZE)}`);
    
    if (result.success) {
      successCount += batch.length;
    } else {
      errorCount += batch.length;
      console.error(`❌ Batch ${Math.floor(i/BATCH_SIZE) + 1} failed:`, result.error);
    }
  }
  
  console.log(`✅ Country insertion complete: ${successCount} success, ${errorCount} errors`);
  return { successCount, errorCount };
}

/**
 * Update existing disaster records to use standardized country codes
 */
function standardizeDisasterCountries() {
  console.log('🔄 Standardizing disaster country names...');
  
  let updateCount = 0;
  
  for (const [originalName, isoCode] of Object.entries(COUNTRY_MAPPINGS)) {
    if (originalName !== isoCode) { // Only update if mapping is different
      const sql = `UPDATE disasters SET country = '${isoCode}' WHERE country = '${originalName.replace(/'/g, "''")}'`;
      const result = executeSQL(sql, `Updating '${originalName}' to '${isoCode}'`);
      
      if (result.success) {
        updateCount++;
      }
    }
  }
  
  console.log(`✅ Disaster standardization complete: ${updateCount} mappings applied`);
  return updateCount;
}

/**
 * Verify the enrichment results
 */
function verifyEnrichment() {
  console.log('🔍 Verifying country enrichment...');
  
  // Check total countries
  const countResult = executeSQL(
    'SELECT COUNT(*) as total FROM countries WHERE region IS NOT NULL',
    'Counting enriched countries'
  );
  
  // Check sample countries with full data
  const sampleResult = executeSQL(
    'SELECT code, name, region, subregion, population, coordinates_lat, coordinates_lng FROM countries WHERE population IS NOT NULL LIMIT 5',
    'Sampling enriched country data'
  );
  
  // Check disaster-country linkage
  const linkageResult = executeSQL(
    'SELECT d.country, c.name, c.region FROM disasters d LEFT JOIN countries c ON d.country = c.code WHERE d.country IS NOT NULL GROUP BY d.country, c.name, c.region LIMIT 10',
    'Verifying disaster-country linkage'
  );
  
  return {
    countResult,
    sampleResult,
    linkageResult
  };
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 Starting Flare360 country enrichment process...');
    
    // Step 1: Fetch country data from REST Countries API
    const countries = await fetchCountryData();
    
    // Step 2: Transform data for database
    const transformedCountries = transformCountryData(countries);
    
    // Step 3: Insert country data
    const insertResult = insertCountryData(transformedCountries);
    
    // Step 4: Standardize existing disaster countries
    const standardizeResult = standardizeDisasterCountries();
    
    // Step 5: Verify results
    const verifyResult = verifyEnrichment();
    
    // Summary
    console.log('\n🎉 Country enrichment completed!');
    console.log('📊 Summary:');
    console.log(`   • Countries processed: ${transformedCountries.length}`);
    console.log(`   • Countries inserted: ${insertResult.successCount}`);
    console.log(`   • Insert errors: ${insertResult.errorCount}`);
    console.log(`   • Disaster mappings: ${standardizeResult}`);
    console.log(`   • Environment: ${env}`);
    console.log(`   • Dry run: ${isDryRun}`);
    
    if (!isDryRun) {
      console.log('\n✅ Database has been enriched with comprehensive country data!');
      console.log('🔗 Country codes in disasters have been standardized to ISO-2 format');
      console.log('📍 Geographic coordinates, population, and regional data are now available');
    } else {
      console.log('\n🔍 Dry run completed - no changes were made to the database');
      console.log('💡 Remove --dry-run flag to apply changes');
    }
    
  } catch (error) {
    console.error('💥 Country enrichment failed:', error.message);
    process.exit(1);
  }
}

// Execute the script
main();