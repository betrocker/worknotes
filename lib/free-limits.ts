export const FREE_CLIENT_LIMIT = 3;
export const FREE_JOB_LIMIT = 3;

export function isFreeClientLimitReached(count: number) {
  return count >= FREE_CLIENT_LIMIT;
}

export function isFreeJobLimitReached(count: number) {
  return count >= FREE_JOB_LIMIT;
}
