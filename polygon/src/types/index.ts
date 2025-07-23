import BigNumber from 'bignumber.js';

export type HexString = `0x${string}`;

export type TransactionRequest = {
  from: HexString;
  to: HexString;
  gasLimit: bigint;
  data: HexString;
};

export type UnbondInfo = {
  amount: BigNumber;
  withdrawEpoch: bigint;
  unbondNonces: bigint;
};
