/**
 * Copyright (c) 2025, Everstake.
 * Licensed under the BSD-3-Clause License. See LICENSE file for details.
 */

let apiUrl = '';

export function setApiUrl(url: string) {
  apiUrl = url;
}

const makeApiFetchFn = <T, A extends unknown[]>(
  fetchArgsFn: (...args: A) => [string | URL | Request, RequestInit?],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformResponseData: (data: any) => T,
  errorMessagePrefix: string,
) => {
  return async (...args: A): Promise<T> => {
    try {
      const response = await fetch(...fetchArgsFn(...args));

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const rawResponseBody = await response.text();
      try {
        return transformResponseData(JSON.parse(rawResponseBody));
      } catch {
        return transformResponseData(rawResponseBody);
      }
    } catch (error) {
      console.error(`${errorMessagePrefix}:`, error);
      throw error;
    }
  };
};

export const checkToken = makeApiFetchFn(
  (token: string) => [
    `${apiUrl}/everstake-wallet/token/check/${token}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } },
  ],
  (data: { result: boolean }) => data.result,
  'Failed to check token',
);

interface SetStatsParams {
  token: string;
  action: string;
  amount: number;
  address: string;
  chain: string;
}

export const setStats = makeApiFetchFn(
  ({ token, action, amount, address, chain }: SetStatsParams) => [
    `${apiUrl}/everstake-wallet/stats/set`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action, amount, address, chain }),
    },
  ],
  () => undefined,
  'Failed to set stats',
);

export const createToken = makeApiFetchFn(
  (name: string, type: string) => [
    `${apiUrl}/everstake-wallet/token/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type }),
    },
  ],
  (data) => data,
  'Failed to create token',
);

export const getAssets = makeApiFetchFn(
  (chain: string) => [
    `${apiUrl}/everstake-dashboard/chain?name=${chain.toLowerCase()}`,
    { method: 'GET' },
  ],
  (data) => data,
  'Failed to get assets',
);

export const getEthValidatorsQueueStats = makeApiFetchFn<
  Record<
    | 'validator_activation_time'
    | 'validator_adding_delay'
    | 'validator_exit_time'
    | 'validator_withdraw_time',
    number
  >,
  []
>(
  () => [`${apiUrl}/everstake-eth-api/validators/queue`, { method: 'GET' }],
  (data) => data,
  'Failed to get ETH validators queue stats',
);
