/**
 * Copyright (c) 2025, Everstake.
 * Licensed under the BSD-3-Clause License. See LICENSE file for details.
 */

import type { TransactionRequest } from 'viem';

export type HexString = `0x${string}`;

import { TESTNET_ABI } from '../bgt_testnet';
import { MAINNET_ABI } from '../bgt_mainnet';

export type Network = 'testnet' | 'mainnet';

export type BGTContract =
  | {
      network: 'testnet';
      contractAddress: HexString;
      abi: typeof TESTNET_ABI;
    }
  | {
      network: 'mainnet';
      contractAddress: HexString;
      abi: typeof MAINNET_ABI;
    };

export type Transaction = Required<
  Pick<TransactionRequest, 'from' | 'to' | 'value' | 'gas' | 'data'>
>;

export type BoostedQueue = {
  lastBlock: number;
  balance: string;
};
