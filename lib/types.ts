export type Zombie = {
  entity_id: number;
  canonical_name: string;
  bn_root: string | null;
  province: string | null;
  total_funding: number;
  fed_total: number;
  ab_total: number;
  cra_total_revenue: number | null;
  cra_govt_share_pct: number | null;
  cra_latest_year: number | null;
  signal: 'stopped_filing' | 'ab_dissolved' | 'ab_struck' | 'ab_cancelled' | 'high_govt_dependency';
  signal_label: string;
  fed_latest_grant: string | null;
  ab_status: string | null;
};

export type ZombieFilter = {
  source?: 'fed' | 'ab' | 'all';
  minFunding?: number;
  province?: string;
  limit?: number;
};

export type DossierData = {
  zombie: Zombie;
  topGrants: Array<{
    source: 'FED' | 'AB';
    amount: number;
    date: string | null;
    department: string | null;
    purpose: string | null;
  }>;
  fundingByYear: Array<{ year: number; total: number }>;
  craFinancials: {
    last_filed_year: number | null;
    revenue: number | null;
    expenditures: number | null;
    govt_share: number | null;
  } | null;
};
