import BigNumber from 'bignumber.js';
import type { TransactionRequest } from 'viem';

export type HexString = `0x${string}`;

export type Transaction = Required<
  Pick<TransactionRequest, 'from' | 'to' | 'gas' | 'data'>
>;

export type UnbondInfo = {
  amount: BigNumber;
  withdrawEpoch: bigint;
  unbondNonces: bigint;
};
