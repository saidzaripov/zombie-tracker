import { q } from './db';
import type { Zombie, ZombieFilter, DossierData } from './types';

/**
 * Zombie definition (v2 — defensible):
 *   Received >= $100K in total public funding, AND triggers at least one
 *   "ceased operations" signal:
 *     1. Linked Alberta non-profit (Alberta-native type only) with status in
 *        Struck / Dissolved / Cancelled / Liquid / Inactive / Con Out / Deleted
 *     2. Last CRA T3010 filed in 2022 or earlier (range is 2020–2024)
 *     3. CRA govt-share-of-revenue >= 70% in last filed year AND last filed <= 2023
 *
 *   AND is NOT currently active:
 *     - cra_latest_year < 2024
 *     - no federal grant in last 12 months
 *
 *   AND is not a government entity (province / municipality / Crown corp).
 *
 *   Extra-Provincial AB types are excluded — those track Alberta registration
 *   only, not whether the org has ceased nationally.
 */

const ZOMBIE_CTE = `
  ab_dead AS (
    SELECT esl.entity_id,
           np.status AS ab_status,
           np.type AS ab_type,
           np.legal_name AS ab_np_name
    FROM general.entity_source_links esl
    JOIN ab.ab_non_profit np ON np.id::text = esl.source_pk->>'id'
    WHERE esl.source_schema = 'ab'
      AND esl.source_table = 'ab_non_profit'
      AND np.status IN ('Struck','Dissolved','Cancelled','Liquid','Inactive','Con Out','Deleted')
      AND np.type NOT ILIKE 'Extra-Provincial%'
  ),
  govt_share AS (
    SELECT DISTINCT ON (LEFT(bn, 9)) LEFT(bn, 9) AS bn_root, govt_share_of_rev::numeric AS pct
    FROM cra.govt_funding_by_charity
    ORDER BY LEFT(bn, 9), fiscal_year DESC
  ),
  province AS (
    SELECT DISTINCT ON (LEFT(bn, 9)) LEFT(bn, 9) AS bn_root, province
    FROM cra.cra_identification
    WHERE province IS NOT NULL
    ORDER BY LEFT(bn, 9), fiscal_year DESC
  )
`;

const ZOMBIE_BASE = `
  SELECT
    f.entity_id,
    f.canonical_name,
    f.bn_root,
    p.province,
    f.total_all_funding::numeric AS total_funding,
    COALESCE(f.fed_total_grants, 0)::numeric AS fed_total,
    (COALESCE(f.ab_total_grants,0)+COALESCE(f.ab_total_contracts,0)+COALESCE(f.ab_total_sole_source,0))::numeric AS ab_total,
    f.cra_total_revenue,
    gs.pct AS cra_govt_share_pct,
    f.cra_latest_year,
    f.fed_latest_grant::text AS fed_latest_grant,
    abd.ab_status,
    CASE
      WHEN abd.ab_status = 'Dissolved' THEN 'ab_dissolved'
      WHEN abd.ab_status = 'Struck' THEN 'ab_struck'
      WHEN abd.ab_status IN ('Cancelled','Liquid','Inactive','Con Out','Deleted') THEN 'ab_cancelled'
      WHEN gs.pct >= 70 AND f.cra_latest_year <= 2022 THEN 'high_govt_dependency'
      WHEN f.cra_latest_year IS NOT NULL AND f.cra_latest_year <= 2022 THEN 'stopped_filing'
      ELSE NULL
    END AS signal,
    CASE
      WHEN abd.ab_status = 'Dissolved' THEN 'Dissolved (Alberta registry)'
      WHEN abd.ab_status = 'Struck' THEN 'Struck from Alberta registry'
      WHEN abd.ab_status IN ('Cancelled','Liquid','Inactive','Con Out','Deleted') THEN abd.ab_status || ' (Alberta registry)'
      WHEN gs.pct >= 70 AND f.cra_latest_year <= 2022 THEN ROUND(gs.pct, 0) || '% public revenue · last T3010 ' || f.cra_latest_year
      WHEN f.cra_latest_year IS NOT NULL AND f.cra_latest_year <= 2022 THEN 'Last T3010 filed in ' || f.cra_latest_year
      ELSE 'Active'
    END AS signal_label
  FROM general.vw_entity_funding f
  LEFT JOIN ab_dead abd ON abd.entity_id = f.entity_id
  LEFT JOIN govt_share gs ON gs.bn_root = f.bn_root
  LEFT JOIN province p ON p.bn_root = f.bn_root
  WHERE f.total_all_funding >= $1
    AND (
      abd.ab_status IS NOT NULL
      OR (f.cra_latest_year IS NOT NULL AND f.cra_latest_year <= 2022)
      OR (gs.pct >= 70 AND f.cra_latest_year <= 2022)
    )
    AND NOT (
      f.cra_latest_year >= 2024
      OR f.fed_latest_grant >= CURRENT_DATE - INTERVAL '12 months'
    )
    AND f.canonical_name NOT ILIKE 'government of %'
    AND f.canonical_name NOT ILIKE 'province of %'
    AND f.canonical_name NOT ILIKE '%municipality of%'
    AND f.canonical_name NOT ILIKE '%city of %'
`;

export async function getZombies(filter: ZombieFilter = {}): Promise<Zombie[]> {
  const limit = Math.min(filter.limit ?? 100, 500);
  const minFunding = filter.minFunding ?? 100_000;
  const params: any[] = [minFunding];

  let sourceFilter = '';
  if (filter.source === 'fed') sourceFilter = `AND COALESCE(f.fed_total_grants, 0) > 0`;
  if (filter.source === 'ab')
    sourceFilter = `AND (COALESCE(f.ab_total_grants,0)+COALESCE(f.ab_total_contracts,0)+COALESCE(f.ab_total_sole_source,0)) > 0`;

  let provinceFilter = '';
  if (filter.province) {
    params.push(filter.province);
    provinceFilter = `AND p.province = $${params.length}`;
  }

  params.push(limit);
  const sql = `
    WITH ${ZOMBIE_CTE}
    ${ZOMBIE_BASE}
      ${sourceFilter}
      ${provinceFilter}
    ORDER BY f.total_all_funding DESC NULLS LAST
    LIMIT $${params.length}
  `;

  const rows = await q<any>(sql, params);
  return rows.map((r) => ({
    ...r,
    total_funding: Number(r.total_funding) || 0,
    fed_total: Number(r.fed_total) || 0,
    ab_total: Number(r.ab_total) || 0,
    cra_total_revenue: r.cra_total_revenue == null ? null : Number(r.cra_total_revenue),
    cra_govt_share_pct: r.cra_govt_share_pct == null ? null : Number(r.cra_govt_share_pct),
  }));
}

export async function getTotalFundingLost(): Promise<number> {
  const rows = await q<{ total: string; n: string }>(
    `
    WITH ${ZOMBIE_CTE}
    SELECT
      COALESCE(SUM(f.total_all_funding), 0)::text AS total,
      COUNT(*)::text AS n
    FROM general.vw_entity_funding f
    LEFT JOIN ab_dead abd ON abd.entity_id = f.entity_id
    LEFT JOIN govt_share gs ON gs.bn_root = f.bn_root
    WHERE f.total_all_funding >= 100000
      AND (
        abd.ab_status IS NOT NULL
        OR (f.cra_latest_year IS NOT NULL AND f.cra_latest_year <= 2022)
        OR (gs.pct >= 70 AND f.cra_latest_year <= 2022)
      )
      AND NOT (
        f.cra_latest_year >= 2024
        OR f.fed_latest_grant >= CURRENT_DATE - INTERVAL '12 months'
      )
      AND f.canonical_name NOT ILIKE 'government of %'
      AND f.canonical_name NOT ILIKE 'province of %'
      AND f.canonical_name NOT ILIKE '%municipality of%'
      AND f.canonical_name NOT ILIKE '%city of %'
    `
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getZombieById(entityId: number): Promise<Zombie | null> {
  const params: any[] = [100_000, entityId];
  const sql = `
    WITH ${ZOMBIE_CTE}
    ${ZOMBIE_BASE}
      AND f.entity_id = $${params.length}
    LIMIT 1
  `;
  const rows = await q<any>(sql, params);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    ...r,
    total_funding: Number(r.total_funding) || 0,
    fed_total: Number(r.fed_total) || 0,
    ab_total: Number(r.ab_total) || 0,
    cra_total_revenue: r.cra_total_revenue == null ? null : Number(r.cra_total_revenue),
    cra_govt_share_pct: r.cra_govt_share_pct == null ? null : Number(r.cra_govt_share_pct),
  };
}

export async function getDossier(entityId: number): Promise<DossierData | null> {
  const zombie = await getZombieById(entityId);
  if (!zombie) return null;

  const topGrantsFed = await q<any>(
    `
    SELECT
      'FED'::text AS source,
      g.agreement_value::numeric AS amount,
      g.agreement_start_date::text AS date,
      g.owner_org_title AS department,
      COALESCE(g.agreement_title_en, g.prog_name_en, g.description_en) AS purpose
    FROM general.entity_source_links esl
    JOIN fed.grants_contributions g
      ON g._id = (esl.source_pk->>'_id')::bigint
    WHERE esl.entity_id = $1
      AND esl.source_schema = 'fed'
      AND esl.source_table = 'grants_contributions'
      AND g.agreement_value > 0
    ORDER BY g.agreement_value DESC NULLS LAST
    LIMIT 5
    `,
    [entityId]
  ).catch((e) => { console.error('topGrantsFed error', e.message); return []; });

  const topGrantsAb = await q<any>(
    `
    SELECT
      'AB'::text AS source,
      g.amount::numeric AS amount,
      g.payment_date::text AS date,
      g.ministry AS department,
      g.program AS purpose
    FROM general.entity_source_links esl
    JOIN ab.ab_grants g
      ON g.id = (esl.source_pk->>'id')::int
    WHERE esl.entity_id = $1
      AND esl.source_schema = 'ab'
      AND esl.source_table = 'ab_grants'
      AND g.amount > 0
    ORDER BY g.amount DESC NULLS LAST
    LIMIT 5
    `,
    [entityId]
  ).catch((e) => { console.error('topGrantsAb error', e.message); return []; });

  const fundingByYear = await q<any>(
    `
    SELECT year, SUM(total)::numeric AS total FROM (
      SELECT EXTRACT(YEAR FROM g.agreement_start_date)::int AS year,
             COALESCE(g.agreement_value, 0)::numeric AS total
      FROM general.entity_source_links esl
      JOIN fed.grants_contributions g
        ON g._id = (esl.source_pk->>'_id')::bigint
      WHERE esl.entity_id = $1
        AND esl.source_schema = 'fed'
        AND esl.source_table = 'grants_contributions'
      UNION ALL
      SELECT EXTRACT(YEAR FROM g.payment_date)::int AS year,
             COALESCE(g.amount, 0)::numeric AS total
      FROM general.entity_source_links esl
      JOIN ab.ab_grants g
        ON g.id = (esl.source_pk->>'id')::int
      WHERE esl.entity_id = $1
        AND esl.source_schema = 'ab'
        AND esl.source_table = 'ab_grants'
    ) x
    WHERE year IS NOT NULL
    GROUP BY year
    ORDER BY year
    `,
    [entityId]
  ).catch((e) => { console.error('fundingByYear error', e.message); return []; });

  const craFinancials = zombie.bn_root
    ? await q<any>(
        `
        SELECT
          fiscal_year AS last_filed_year,
          revenue,
          total_govt AS govt_share
        FROM cra.govt_funding_by_charity
        WHERE LEFT(bn, 9) = $1
        ORDER BY fiscal_year DESC
        LIMIT 1
        `,
        [zombie.bn_root]
      ).catch(() => [])
    : [];

  return {
    zombie,
    topGrants: [
      ...topGrantsFed.map((g: any) => ({ ...g, amount: Number(g.amount) })),
      ...topGrantsAb.map((g: any) => ({ ...g, amount: Number(g.amount) })),
    ].sort((a, b) => b.amount - a.amount).slice(0, 6),
    fundingByYear: fundingByYear.map((r: any) => ({ year: r.year, total: Number(r.total) })),
    craFinancials: craFinancials[0]
      ? {
          last_filed_year: craFinancials[0].last_filed_year,
          revenue: craFinancials[0].revenue == null ? null : Number(craFinancials[0].revenue),
          expenditures: null,
          govt_share: craFinancials[0].govt_share == null ? null : Number(craFinancials[0].govt_share),
        }
      : null,
  };
}
