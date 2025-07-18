/**
 * Copyright (c) 2025, Everstake.
 * Licensed under the BSD-3-Clause License. See LICENSE file for details.
 */

import {
  Abi,
  createPublicClient,
  encodeFunctionData,
  FallbackTransport,
  formatUnits,
  http,
  HttpTransport,
  parseUnits,
  PublicClient,
  TransactionReceiptNotFoundError,
} from 'viem';

import { Blockchain } from '../../utils';
import { CheckToken, SetStats } from '../../utils/api';
import { COMMON_ERROR_MESSAGES } from '../../utils/constants/errors';

import { ERROR_MESSAGES, ORIGINAL_ERROR_MESSAGES } from './constants/errors';
import {
  ABI_CONTRACT_APPROVE,
  ABI_CONTRACT_BUY,
  ABI_CONTRACT_STAKING,
} from './abi';
import {
  ADDRESS_CONTRACT_APPROVE,
  ADDRESS_CONTRACT_APPROVE_POL,
  ADDRESS_CONTRACT_BUY,
  ADDRESS_CONTRACT_STAKING,
  CHAIN,
  CLAIM_REWARDS_BASE_GAS,
  CLAIM_UNDELEGATE_BASE_GAS,
  DELEGATE_BASE_GAS,
  MIN_AMOUNT,
  RESTAKE_BASE_GAS,
  RPC_URL,
  UNDELEGATE_BASE_GAS,
  WITHDRAW_EPOCH_DELAY,
} from './constants';
import BigNumber from 'bignumber.js';
import { HexString, TransactionRequest, UnbondInfo } from './types';

interface ContractProps<T extends Abi> {
  abi: T;
  address: HexString;
}

/**
 * The `Polygon` class extends the `Blockchain` class and provides methods for interacting with the Polygon network.
 *
 * It handles initialization of Web3 and multiple contract instances, including approval contracts,
 * buy contracts, and staking contracts. It also manages error messages related to contract operations.
 *
 * @property {Web3} web3 - The Web3 instance used for interacting with the Polygon network.
 * @property {Contract} contract_approve - The contract instance for token approval.
 * @property {Contract} contract_approve_pol - The contract instance for POL token approval.
 * @property {Contract} contract_buy - The contract instance for token purchase logic.
 * @property {Contract} contract_staking - The contract instance for staking logic.
 * @property ERROR_MESSAGES - The standardized error messages for the Polygon class.
 * @property ORIGINAL_ERROR_MESSAGES - The raw/original error messages for internal mapping or debugging.
 *
 * @constructor
 * Creates an instance of the `Polygon` class.
 * @param {string} [rpc=RPC_URL] - The RPC URL of the Polygon network.
 */

export class Polygon extends Blockchain {
  public contract_approve: ContractProps<typeof ABI_CONTRACT_APPROVE>;
  public contract_approve_pol: ContractProps<typeof ABI_CONTRACT_APPROVE>;
  public contract_buy: ContractProps<typeof ABI_CONTRACT_BUY>;
  public contract_staking: ContractProps<typeof ABI_CONTRACT_STAKING>;

  private client: PublicClient;
  protected ERROR_MESSAGES = ERROR_MESSAGES;
  protected ORIGINAL_ERROR_MESSAGES = ORIGINAL_ERROR_MESSAGES;

  constructor(
    rpcOrTransport: string | HttpTransport | FallbackTransport = RPC_URL,
  ) {
    super();
    this.client = createPublicClient({
      transport:
        typeof rpcOrTransport === 'string'
          ? http(rpcOrTransport, {
              /** Defaults to 3 */
              retryCount: 1,
              /** Defaults to 150 */
              retryDelay: 300,
            })
          : rpcOrTransport,
    });
    this.contract_approve = {
      abi: ABI_CONTRACT_APPROVE,
      address: ADDRESS_CONTRACT_APPROVE,
    };
    this.contract_approve_pol = {
      abi: ABI_CONTRACT_APPROVE,
      address: ADDRESS_CONTRACT_APPROVE_POL,
    };
    this.contract_buy = {
      abi: ABI_CONTRACT_BUY,
      address: ADDRESS_CONTRACT_BUY,
    };
    this.contract_staking = {
      abi: ABI_CONTRACT_STAKING,
      address: ADDRESS_CONTRACT_STAKING,
    };
  }

  /**
   * Checks if a transaction is still pending or has been confirmed.
   *
   * @param {HexString} hash - The transaction hash to check.
   * @returns {Promise<{ result: boolean }>}
   *
   * @throws {Error} Throws an error with code `'TRANSACTION_LOADING_ERR'` if an issue occurs while fetching the transaction status.
   *
   */
  public async isTransactionLoading(
    hash: HexString,
  ): Promise<{ result: boolean }> {
    try {
      try {
        await this.client.getTransactionReceipt({ hash });

        return { result: false };
      } catch (e) {
        if (e instanceof TransactionReceiptNotFoundError) {
          return { result: true };
        }

        throw e;
      }
    } catch (error) {
      throw this.handleError('TRANSACTION_LOADING_ERR', error);
    }
  }
  /** approve returns TX loading status
   * @param {HexString} address - user's address
   * @param {string} amount - amount for approve
   * @param {boolean} isPOL - is POL token (false - old MATIC)
   * @returns {Promise<Object>} Promise object the result of boolean type
   */
  public async approve(
    address: HexString,
    amount: string,
    isPOL = false,
  ): Promise<TransactionRequest> {
    const amountWei = parseUnits(amount, 18);

    if (new BigNumber(amountWei).isLessThan(MIN_AMOUNT)) {
      throw new Error(
        `Min Amount ${formatUnits(BigInt(MIN_AMOUNT.toString()), 18)} matic`,
      );
    }

    const contract = isPOL ? this.contract_approve_pol : this.contract_approve;

    try {
      return await this.getTransaction(
        encodeFunctionData({
          abi: contract.abi,
          functionName: 'approve',
          args: [ADDRESS_CONTRACT_STAKING, amountWei],
        }),
        address,
        contract.address,
      );
    } catch (error) {
      throw this.handleError('APPROVE_ERR', error);
    }
  }

  /** delegate makes unsigned delegation TX
   * @param {string} token - auth token
   * @param {HexString} address - user's address
   * @param {string} amount - amount for approve
   * @param {boolean} isPOL - is POL token (false - old MATIC)
   * @returns {Promise<Object>} Promise object represents the unsigned TX object
   */
  public async delegate(
    token: string,
    address: HexString,
    amount: string,
    isPOL = false,
  ): Promise<TransactionRequest> {
    if (await CheckToken(token)) {
      const amountWei = parseUnits(amount, 18);
      if (new BigNumber(amountWei).isLessThan(MIN_AMOUNT))
        throw new Error(`Min Amount ${MIN_AMOUNT} wei matic`);

      try {
        const allowedAmount = await this.getAllowance(address);
        if (
          allowedAmount &&
          new BigNumber(allowedAmount.toString()).isLessThan(amountWei)
        ) {
          this.throwError('ALLOWANCE_ERR');
        }

        const data = encodeFunctionData({
          abi: this.contract_buy.abi,
          functionName: isPOL ? 'buyVoucherPOL' : 'buyVoucher',
          args: [amountWei, 0n],
        });

        // Create the transaction
        const tx = {
          from: address,
          to: ADDRESS_CONTRACT_BUY,
          gasLimit: DELEGATE_BASE_GAS,
          data,
        };

        await SetStats({
          token,
          action: 'stake',
          amount: Number(amount),
          address,
          chain: CHAIN,
        });
        // Sign the transaction

        return tx;
      } catch (error) {
        throw this.handleError('DELEGATE_ERR', error);
      }
    } else {
      throw new Error(COMMON_ERROR_MESSAGES.TOKEN_ERROR);
    }
  }
  /** undelegate makes unsigned undelegate TX
   * @param {string} token - auth token
   * @param {HexString} address - user's address
   * @param {string} amount - amount for approve
   * @param {boolean} isPOL - is POL token (false - old MATIC)
   * @returns {Promise<Object>} Promise object represents the unsigned TX object
   */
  public async undelegate(
    token: string,
    address: HexString,
    amount: string,
    isPOL = false,
  ): Promise<TransactionRequest> {
    if (await CheckToken(token)) {
      try {
        const amountWei = parseUnits(amount, 18);
        const delegatedBalance = await this.getTotalDelegate(address);

        if (
          delegatedBalance &&
          delegatedBalance.isLessThan(BigNumber(amount))
        ) {
          this.throwError('DELEGATED_BALANCE_ERR');
        }

        const data = encodeFunctionData({
          abi: this.contract_buy.abi,
          functionName: isPOL ? 'sellVoucher_newPOL' : 'sellVoucher_new',
          args: [amountWei, amountWei],
        });

        // Create the transaction
        const tx = {
          from: address,
          to: ADDRESS_CONTRACT_BUY,
          gasLimit: UNDELEGATE_BASE_GAS,
          data,
        };

        await SetStats({
          token,
          action: 'unstake',
          amount: Number(amount),
          address,
          chain: CHAIN,
        });

        return tx;
      } catch (error) {
        throw this.handleError('UNDELEGATE_ERR', error);
      }
    } else {
      throw new Error(COMMON_ERROR_MESSAGES.TOKEN_ERROR);
    }
  }

  /** claimUndelegate makes unsigned claim undelegate TX
   * @param {HexString} address - user's address
   * @param {bigint} unbondNonce - unbound nonce
   * @param {boolean} isPOL - is POL token (false - old MATIC)
   * @returns {Promise<Object>} Promise object represents the unsigned TX object
   */
  public async claimUndelegate(
    address: HexString,
    unbondNonce = 0n,
    isPOL = false,
  ): Promise<TransactionRequest> {
    const unbond = await this.getUnbond(address, unbondNonce);

    if (BigNumber(unbond.amount).isZero()) throw new Error(`Nothing to claim`);

    const currentEpoch = await this.getCurrentEpoch();

    if (
      BigNumber(currentEpoch.toString()).isLessThan(
        BigNumber(unbond.withdrawEpoch.toString()).plus(
          BigNumber(WITHDRAW_EPOCH_DELAY.toString()),
        ),
      )
    ) {
      throw new Error(`Current epoch less than withdraw delay`);
    }

    const data = encodeFunctionData({
      abi: this.contract_buy.abi,
      functionName: isPOL
        ? 'unstakeClaimTokens_newPOL'
        : 'unstakeClaimTokens_new',
      args: [unbond.unbondNonces],
    });

    return {
      from: address,
      to: ADDRESS_CONTRACT_BUY,
      gasLimit: CLAIM_UNDELEGATE_BASE_GAS,
      data,
    };
  }

  /** reward makes unsigned claim reward TX
   * @param {string} address - user's address
   * @param {boolean} isPOL - is POL token (false - old MATIC)
   * @returns {Promise<Object>} Promise object represents the unsigned TX object
   */
  public async reward(
    address: string,
    isPOL = false,
  ): Promise<TransactionRequest> {
    const data = encodeFunctionData({
      abi: this.contract_buy.abi,
      functionName: isPOL ? 'withdrawRewardsPOL' : 'withdrawRewards',
      args: [],
    });

    // Create the transaction
    return {
      from: address,
      to: ADDRESS_CONTRACT_BUY,
      gasLimit: CLAIM_REWARDS_BASE_GAS,
      data,
    };
  }

  /** restake makes unsigned restake reward TX
   * @param {string} address - user's address
   * @param {boolean} isPOL - is POL token (false - old MATIC)
   * @returns {Promise<Object>} Promise object represents the unsigned TX object
   */
  public async restake(
    address: string,
    isPOL = false,
  ): Promise<TransactionRequest> {
    const data = encodeFunctionData({
      abi: this.contract_buy.abi,
      functionName: isPOL ? 'restakePOL' : 'restake',
      args: [],
    });

    // Create the transaction
    return {
      from: address,
      to: ADDRESS_CONTRACT_BUY,
      gasLimit: RESTAKE_BASE_GAS,
      data,
    };
  }

  /** getReward returns reward number
   * @param {HexString} address - user's address
   * @returns {Promise<BigNumber>} Promise with number of the reward
   */
  public async getReward(address: HexString): Promise<BigNumber> {
    try {
      const result = await this.client.readContract({
        address: this.contract_buy.address,
        abi: this.contract_buy.abi,
        functionName: 'getLiquidRewards',
        args: [address],
      });

      return new BigNumber(formatUnits(result, 18));
    } catch (error) {
      throw this.handleError('GET_REWARD_ERR', error);
    }
  }

  /** getAllowance returns allowed number for spender
   * @param {string} owner - tokens owner
   * @param {boolean} isPOL - is POL token (false - old MATIC)
   * @param {string} spender - contract spender
   * @returns {Promise<bigint>} Promise allowed bigint for spender
   */
  public async getAllowance(
    owner: HexString,
    isPOL = false,
    spender: HexString = ADDRESS_CONTRACT_STAKING,
  ): Promise<bigint> {
    const contract = isPOL ? this.contract_approve_pol : this.contract_approve;

    try {
      return await this.client.readContract({
        address: contract.address,
        abi: contract.abi,
        functionName: 'allowance',
        args: [owner, spender],
      });
    } catch (error) {
      throw this.handleError('GET_ALLOWANCE_ERR', error);
    }
  }

  /** getTotalDelegate returns total delegated number
   * @param {string} address - user's address
   * @returns {Promise<BigNumber>} Promise with BigNumber of the delegation
   */
  public async getTotalDelegate(address: HexString): Promise<BigNumber> {
    try {
      const [result] = await this.client.readContract({
        address: this.contract_buy.address,
        abi: this.contract_buy.abi,
        functionName: 'getTotalStake',
        args: [address],
      });

      return new BigNumber(formatUnits(result, 18));
    } catch (error) {
      throw this.handleError('GET_TOTAL_DELEGATE_ERR', error);
    }
  }

  /** getUnbond returns unbound data
   * @param {HexString} address - user's address
   * @param {bigint} unbondNonce - unbound nonce
   * @returns {Promise<Object>} Promise Object with unbound data
   */
  public async getUnbond(
    address: HexString,
    unbondNonce = 0n,
  ): Promise<UnbondInfo> {
    try {
      const unbondNoncesRes = await this.getUnbondNonces(address);

      // Get recent nonces if not provided
      const unbondNonces = unbondNonce === 0n ? unbondNoncesRes : unbondNonce;

      const [res0, res1] = await this.client.readContract({
        address: this.contract_buy.address,
        abi: this.contract_buy.abi,
        functionName: 'unbonds_new',
        args: [address, unbondNonces],
      });

      return {
        amount: new BigNumber(formatUnits(res0, 18)),
        withdrawEpoch: res1,
        unbondNonces,
      };
    } catch (error) {
      throw this.handleError('GET_UNBOND_ERR', error);
    }
  }

  /** getUnbondNonces returns unbound nonce
   * @param {HexString} address - user's address
   * @returns {Promise<bigint>} Promise with unbound nonce bigint
   */
  public async getUnbondNonces(address: HexString): Promise<bigint> {
    try {
      return await this.client.readContract({
        address: this.contract_buy.address,
        abi: this.contract_buy.abi,
        functionName: 'unbondNonces',
        args: [address],
      });
    } catch (error) {
      throw this.handleError('GET_UNBOND_NONCE_ERR', error);
    }
  }

  /** getCurrentEpoch returns current epoch
   * @returns {Promise<bigint>} Promise with current epoch bigint
   */
  public async getCurrentEpoch(): Promise<bigint> {
    return this.client.readContract({
      address: this.contract_staking.address,
      abi: this.contract_staking.abi,
      functionName: 'currentEpoch',
    });
  }

  private async getTransaction(
    data: HexString,
    address: HexString,
    contractAddress: HexString,
  ): Promise<TransactionRequest> {
    const gasLimit = await this.client.estimateGas({
      to: contractAddress,
      data,
      account: address,
    });

    return {
      from: address,
      to: contractAddress,
      gasLimit,
      data,
    };
  }
}
