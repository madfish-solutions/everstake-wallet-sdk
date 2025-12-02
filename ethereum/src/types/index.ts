/**
 * Copyright (c) 2025, Everstake.
 * Licensed under the BSD-3-Clause License. See LICENSE file for details.
 */

import BigNumber from 'bignumber.js';
import type { TransactionRequest } from 'viem';

export type HexString = `0x${string}`;

export type EthNetworkType = 'mainnet' | 'holesky' | 'hoodi';

export interface EthNetworkAddresses {
  addressContractAccounting: HexString;
  addressContractPool: HexString;
  addressContractWithdrawTreasury: HexString;
  rpcUrl: string;
}

export type EthNetworkAddressesMap = {
  [K in EthNetworkType]: EthNetworkAddresses;
};

export type EthTransaction = Required<
  Pick<TransactionRequest, 'from' | 'to' | 'value' | 'gas' | 'data'>
>;

export enum ValidatorStatus {
  Unknown = 0,
  Pending = 1,
  Deposited = 2,
}

export interface AggregatedBalances {
  [key: string]: string;
}

export interface ContractViewsStats {
  pendingBalanceOf: BigNumber;
  pendingDepositedBalanceOf: BigNumber;
  pendingRestakedRewardOf: BigNumber;
  autocompoundBalanceOf: BigNumber;
  depositedBalanceOf: BigNumber;
  restakedRewardOf: BigNumber;
  withdrawRequest: {
    requested: BigNumber;
    readyForClaim: BigNumber;
  };
  balance: BigNumber;
  pendingBalance: BigNumber;
  pendingDepositedBalance: BigNumber;
  pendingRestakedRewards: BigNumber;
  readyforAutocompoundRewardsAmount: BigNumber;
  withdrawRequestQueueParams: {
    withdrawRequested: BigNumber;
    interchangeAllowed: BigNumber;
    filled: BigNumber;
    claimed: BigNumber;
  };
  poolFee: BigNumber;
  minStakeAmount: BigNumber;
}
