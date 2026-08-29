'use strict';

const GENERATION_PATTERN = /^(0|[1-9]\d{0,15})$/;

function canonicalGeneration(value, name = 'generation') {
  if (typeof value !== 'string' || !GENERATION_PATTERN.test(value)) throw new TypeError(`${name} must be a canonical unsigned decimal string`);
  const numeric = BigInt(value);
  if (numeric < 1n) throw new TypeError(`${name} must be at least 1`);
  return numeric.toString(10);
}

function compareGenerations(left, right) {
  const a = BigInt(canonicalGeneration(left));
  const b = BigInt(canonicalGeneration(right));
  return a < b ? -1 : a > b ? 1 : 0;
}

module.exports = { GENERATION_PATTERN, canonicalGeneration, compareGenerations };
