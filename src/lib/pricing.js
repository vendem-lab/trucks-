import { PRICED_SERVICES, SERVICE_BY_ID } from '../config.js';

const FUEL_SURCHARGE = 0.08;

export function calculateEstimate({ service, distanceKm, weightTons }) {
  const config = SERVICE_BY_ID[service] || PRICED_SERVICES[0];
  const distance = Math.max(0, Number(distanceKm) || 0);
  const weight = Math.max(0, Number(weightTons) || 0);

  const base = config.base;
  const distanceCost = Math.round(distance * config.perKm);
  const extraTons = Math.max(0, weight - config.includedTons);
  const weightCost = Math.round(extraTons * config.perTon);
  const subtotal = base + distanceCost + weightCost;
  const fuel = Math.round(subtotal * FUEL_SURCHARGE);

  return {
    service: config.id,
    base,
    distanceCost,
    weightCost,
    fuel,
    subtotal,
    total: subtotal + fuel
  };
}

export function estimateRange(total) {
  const value = Number(total) || 0;
  return {
    low: Math.round((value * 0.92) / 10) * 10,
    high: Math.round((value * 1.08) / 10) * 10
  };
}
