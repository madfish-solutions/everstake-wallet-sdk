/**
 * Copyright (c) 2025, Everstake.
 * Licensed under the BSD-3-Clause License. See LICENSE file for details.
 */

import BigNumber from 'bignumber.js';

export type HexString = `0x${string}`;

export type EthNetworkType = 'mainnet' | 'holesky';

export interface EthNetworkAddresses {
  addressContractAccounting: HexString;
  addressContractPool: HexString;
  addressContractWithdrawTreasury: HexString;
  rpcUrl: string;
}

export type EthNetworkAddressesMap = {
  [K in EthNetworkType]: EthNetworkAddresses;
};

export type EthTransaction = {
  from: HexString;
  to: HexString;
  value: BigNumber;
  gasLimit: number;
  data: HexString;
};

export enum ValidatorStatus {
  Unknown = 0,
  Pending = 1,
  Deposited = 2,
}

export interface AggregatedBalances {
  [key: string]: string;
}
