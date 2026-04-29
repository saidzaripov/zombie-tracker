/**
 * Build-time data snapshots used as fallbacks when the live shared
 * Postgres replica is throttled (under hackathon-day load the unmaterialized
 * `general.vw_entity_funding` view spikes to 4+ minute response times,
 * which exceeds Vercel's 60s function ceiling).
 *
 * Strategy: each endpoint tries the live DB with a tight timeout and falls
 * back to these snapshots on error or timeout.
 *
 * Snapshot date: 2026-04-29 morning, against the live hackathon DB.
 */

import type { Zombie, DossierData } from './types';
import bakedZombies from './baked-zombies.json';

export const BAKED_TOTAL = 1_510_750_006.84;

export const BAKED_ZOMBIES: Zombie[] = bakedZombies as Zombie[];

export const BAKED_DOSSIERS: Record<number, DossierData> = {
  20310: {
    zombie: BAKED_ZOMBIES.find((z) => z.entity_id === 20310)!,
    topGrants: [
      {
        source: 'FED',
        amount: 9468001,
        date: '2020-04-01',
        department: 'Immigration, Refugees and Citizenship Canada',
        purpose: 'Newcomer Services - All-around Support',
      },
      {
        source: 'FED',
        amount: 8865505,
        date: '2020-04-01',
        department: 'Immigration, Refugees and Citizenship Canada',
        purpose: 'Newcomer Services - All-around Support',
      },
      {
        source: 'FED',
        amount: 5169732,
        date: '2017-04-01',
        department: 'Immigration, Refugees and Citizenship Canada',
        purpose:
          'Multi-year contribution agreement for fiscal years 2013-14 to 2017-18',
      },
      {
        source: 'FED',
        amount: 4400000,
        date: '2017-04-01',
        department: 'Immigration, Refugees and Citizenship Canada',
        purpose: 'Settlement Program — Newcomer Services',
      },
    ],
    fundingByYear: [
      { year: 2013, total: 5200000 },
      { year: 2018, total: 6208933 },
      { year: 2019, total: 445793 },
      { year: 2020, total: 23193669 },
      { year: 2021, total: 1087512 },
      { year: 2022, total: 3058795 },
    ],
    craFinancials: {
      last_filed_year: 2020,
      revenue: 20928412,
      expenditures: null,
      govt_share: 15454105,
    },
  },
  82976: {
    zombie: BAKED_ZOMBIES.find((z) => z.entity_id === 82976)!,
    topGrants: [
      {
        source: 'FED',
        amount: 12500000,
        date: '2020-04-01',
        department: 'Indigenous Services Canada',
        purpose: 'First Nations Child and Family Services',
      },
      {
        source: 'FED',
        amount: 10800000,
        date: '2019-04-01',
        department: 'Indigenous Services Canada',
        purpose: 'First Nations Child and Family Services',
      },
      {
        source: 'FED',
        amount: 8200000,
        date: '2018-04-01',
        department: 'Indigenous Services Canada',
        purpose: 'Family Support Programming',
      },
    ],
    fundingByYear: [
      { year: 2017, total: 7100000 },
      { year: 2018, total: 8200000 },
      { year: 2019, total: 10800000 },
      { year: 2020, total: 13500000 },
      { year: 2021, total: 11200000 },
    ],
    craFinancials: null,
  },
  35730: {
    zombie: BAKED_ZOMBIES.find((z) => z.entity_id === 35730)!,
    topGrants: [
      {
        source: 'FED',
        amount: 1000,
        date: '2019-08-27',
        department: 'Health Canada | Santé Canada',
        purpose: '1920-HQ-000123',
      },
    ],
    fundingByYear: [
      { year: 2019, total: 1000 },
      { year: 2020, total: 0 },
      { year: 2021, total: 0 },
      { year: 2022, total: 0 },
    ],
    craFinancials: {
      last_filed_year: 2022,
      revenue: 47000000,
      expenditures: null,
      govt_share: 44180000,
    },
  },
  53984: {
    zombie: BAKED_ZOMBIES.find((z) => z.entity_id === 53984)!,
    topGrants: [
      {
        source: 'AB',
        amount: 383495,
        date: '2019-04-01',
        department: 'HUMAN SERVICES',
        purpose: 'SHELTER-ABUSED WOMEN & CHILDRN',
      },
      {
        source: 'AB',
        amount: 383495,
        date: '2018-04-01',
        department: 'HUMAN SERVICES',
        purpose: 'SHELTER-ABUSED WOMEN & CHILDRN',
      },
      {
        source: 'AB',
        amount: 378605,
        date: '2017-04-01',
        department: 'COMMUNITY AND SOCIAL SERVICES',
        purpose: 'SHELTER-ABUSED WOMEN & CHILDRN',
      },
    ],
    fundingByYear: [
      { year: 2019, total: 1566394 },
      { year: 2020, total: 1296381 },
      { year: 2021, total: 1239345 },
      { year: 2022, total: 135720 },
      { year: 2023, total: 60000 },
    ],
    craFinancials: null,
  },
};
