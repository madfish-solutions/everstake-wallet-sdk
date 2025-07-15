import BigNumber from 'bignumber.js';

export type HexString = `0x${string}`;

export type TransactionRequest = {
  from: string;
  to: string;
  gasLimit: bigint;
  data: string;
};

export type UnbondInfo = {
  amount: BigNumber;
  withdrawEpoch: bigint;
  unbondNonces: bigint;
};
