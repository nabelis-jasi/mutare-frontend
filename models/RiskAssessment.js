function calculateRiskScore(ageYears, blockageCount, materialFactor) {
  const ageRisk = Math.min(ageYears / 50, 1.0);
  const blockageRisk = Math.min(blockageCount / 20, 1.0);
  const materialRisk = Math.min(materialFactor, 2.0) / 2.0;
  const total = (ageRisk * 0.4 + blockageRisk * 0.4 + materialRisk * 0.2) * 100;
  return Math.round(total * 10) / 10;
}

async function getAssetProfile(assetId, pgClient) {
  const assetRes = await pgClient.query(`SELECT * FROM assets WHERE id = $1`, [assetId]);
  if (assetRes.rows.length === 0) return null;
  const asset = assetRes.rows[0];
  const logsRes = await pgClient.query(`SELECT * FROM job_logs WHERE asset_id = $1 ORDER BY date DESC`, [assetId]);
  const ageYears = new Date().getFullYear() - new Date(asset.installation_date).getFullYear();
  const risk = calculateRiskScore(ageYears, logsRes.rows.length, asset.material_factor || 1.0);
  return { asset, logs: logsRes.rows, risk };
}

module.exports = { calculateRiskScore, getAssetProfile };
