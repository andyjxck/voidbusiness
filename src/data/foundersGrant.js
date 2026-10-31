// Founders Bundle dealership: issued once per entitlement. Used by App.js at
// save load (a restore that finished before the save was read) and when the
// store notifies mid-session (a restore that finished after it), so a
// Founders restore on a fresh install always ends with the dealership.

import { needsFoundersDealership, markFoundersDealershipIssued } from './store';
import { createFoundersDealership } from './dealership';

// Returns { businesses, issued }. `businesses` is the list with the
// dealership appended when the bundle is owned and it hasn't been issued yet.
// An existing Founders dealership (e.g. restored with the iCloud save) just
// marks the grant as issued, so it is never doubled.
export function issueFoundersDealership(businesses) {
  const list = Array.isArray(businesses) ? businesses : [];
  if (!needsFoundersDealership()) return { businesses: list, issued: false };
  if (list.some((b) => b && b.foundersDealership)) {
    markFoundersDealershipIssued();
    return { businesses: list, issued: false };
  }
  const biz = createFoundersDealership();
  if (!biz) return { businesses: list, issued: false };
  markFoundersDealershipIssued();
  return { businesses: [...list, { ...biz, foundersDealership: true }], issued: true };
}
