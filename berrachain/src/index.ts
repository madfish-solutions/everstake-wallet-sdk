/**
 * Copyright (c) 2025, Everstake.
 * Licensed under the BSD-3-Clause License. See LICENSE file for details.
 */

import BigNumber from 'bignumber.js';
import {
  createPublicClient,
  encodeFunctionData,
  FallbackTransport,
  http,
  HttpTransport,
  PublicClient,
} from 'viem';
import { parseUnits, isAddress } from 'viem/utils';

import { Blockchain } from '../../utils';
import {
  BGTContract,
  BoostedQueue,
  HexString,
  Network,
  Transaction,
} from './types';
import { MAINNET_ABI } from './bgt_mainnet';
import { TESTNET_ABI } from './bgt_testnet';
import {
  GAS_RESERVE,
  MAINNET_BGT_CONTRACT_ADDRESS,
  MAINNET_VALIDATOR,
  TESTNET_BGT_CONTRACT_ADDRESS,
  TESTNET_VALIDATOR,
} from './constants';

import { ERROR_MESSAGES, ORIGINAL_ERROR_MESSAGES } from './constants/errors';

/**
 * The `Berrachain` class extends the `Blockchain` class and provides methods for interacting with the Berrachain network.
 *
 * It allows you to select a network, initialize it, and retrieve the balance of the contract.
 *
 * @property {string} validator - The address of the validator.
 * @property {PublicClient} client - The PublicClient instance used for interacting with the Ethereum network.
 * @property {Contract} btg - The BTG contract instance.
 * @property ERROR_MESSAGES - The error messages for the Berrachain class.
 * @property ORIGINAL_ERROR_MESSAGES - The original error messages for the Berrachain class.
 *
 */
export class Berrachain extends Blockchain {
  private validator: HexString;
  private client: PublicClient;
  private btg: BGTContract;
  private readonly network: Network;

  protected ERROR_MESSAGES = ERROR_MESSAGES;
  protected ORIGINAL_ERROR_MESSAGES = ORIGINAL_ERROR_MESSAGES;

  constructor(
    network: Network = 'mainnet',
    rpcOrTransport: string | HttpTransport | FallbackTransport,
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
    this.network = network;
    switch (network) {
      case 'mainnet':
        this.validator = MAINNET_VALIDATOR;
        this.btg = {
          network: network,
          abi: MAINNET_ABI,
          contractAddress: MAINNET_BGT_CONTRACT_ADDRESS,
        };
        break;
      case 'testnet':
        this.validator = TESTNET_VALIDATOR;
        this.btg = {
          network: network,
          abi: TESTNET_ABI,
          contractAddress: TESTNET_BGT_CONTRACT_ADDRESS,
        };
        break;
      default:
        this.throwError('NETWORK_ERROR');
    }
  }

  /**
   * Retrieves the balance of the user by address
   *
   * @param address - The staker address
   * @returns A Promise that resolves to the balance.
   *
   * @throws Will throw an error if the contract call fails.
   */
  public async balanceOf(address: HexString): Promise<string> {
    try {
      const rawResult = await this.client.readContract({
        address: this.btg.contractAddress,
        abi: this.btg.abi,
        functionName: 'balanceOf',
        args: [address],
      });

      return String(rawResult);
    } catch (error) {
      this.handleError('BALANCE_ERROR', error);
    }
  }

  public async stakeAllowance(address: HexString): Promise<string> {
    try {
      const rawResult = await this.client.readContract({
        address: this.btg.contractAddress,
        abi: this.btg.abi,
        functionName: 'allowance',
        args: [address, this.btg.contractAddress],
      });

      return String(rawResult);
    } catch (error) {
      this.handleError('ALLOWANCE_ERROR', error);
    }
  }

  public async approveForStake(
    address: HexString,
    amount: string,
  ): Promise<Transaction> {
    try {
      return await this.getTransaction(
        encodeFunctionData({
          abi: this.btg.abi,
          functionName: 'approve',
          args: [this.btg.contractAddress, parseUnits(amount, 18)],
        }),
        address,
      );
    } catch (error) {
      this.handleError('APPROVE_FOR_STAKE_ERROR', error);
    }
  }

  /**
   * Retrieves the boosted stake of the user by address
   *
   * @param address - The staker address
   * @returns A Promise that resolves to the boosted stake.
   *
   * @throws Will throw an error if the contract call fails.
   */
  public async getStake(address: HexString): Promise<string> {
    try {
      const rawResult = await this.client.readContract({
        address: this.btg.contractAddress,
        abi: this.btg.abi,
        functionName: 'boosted',
        args: [address, this.validator],
      });

      return String(rawResult);
    } catch (error) {
      this.handleError('BOOSTED_ERROR', error);
    }
  }

  /**
   * Retrieves all uses boosts by address
   *
   * @param address - The staker address
   * @returns A Promise that resolves to the ball user's boosts.
   *
   * @throws Will throw an error if the contract call fails.
   */
  public async getStakes(address: HexString): Promise<number> {
    try {
      const rawResult = await this.client.readContract({
        address: this.btg.contractAddress,
        abi: this.btg.abi,
        functionName: 'boosts',
        args: [address],
      });

      return Number(rawResult);
    } catch (error) {
      this.handleError('BOOSTS_ERROR', error);
    }
  }

  /**
   * Retrieves info about user's boost queue by address
   *
   * @param address - The staker address
   * @returns A Promise that resolves to the balance in queue.
   *
   * @throws Will throw an error if the contract call fails.
   */
  public async getStakeInQueue(address: HexString): Promise<BoostedQueue> {
    try {
      const result = await this.client.readContract({
        address: this.btg.contractAddress,
        abi: this.btg.abi,
        functionName: 'boostedQueue',
        args: [address, this.validator],
      });

      return {
        lastBlock: Number(result[0]),
        balance: result[1] ? result[1].toString() : '0',
      };
    } catch (error) {
      this.handleError('BOOST_QUEUE_ERROR', error);
    }
  }

  /**
   * Creates a transaction data for boost activation
   *
   * @param address - The staker address
   * @returns A Promise that resolves to the transaction data
   *
   * @throws Will throw an error if the contract call fails.
   */
  public async activateStake(address: HexString): Promise<Transaction> {
    try {
      let data: HexString;
      switch (this.btg.network) {
        case 'testnet':
          data = encodeFunctionData({
            abi: this.btg.abi,
            functionName: 'activateBoost',
            args: [this.validator],
          });
          break;
        case 'mainnet':
          data = encodeFunctionData({
            abi: this.btg.abi,
            functionName: 'activateBoost',
            args: [address, this.validator],
          });
          break;
      }

      return await this.getTransaction(data, address);
    } catch (error) {
      this.handleError('ACTIVATE_BOOST_ERROR', error);
    }
  }

  /**
   * Creates a transaction data for canceling boost queue
   *
   * @param address - The staker address
   * @param amount - The amount of boost
   * @returns A Promise that resolves to the transaction data
   *
   * @throws Will throw an error if the contract call fails.
   */
  public async cancelStakeInQueue(
    address: string,
    amount: string,
  ): Promise<Transaction> {
    try {
      if (!isAddress(address)) {
        this.throwError('ADDRESS_FORMAT_ERROR');
      }

      return await this.getTransaction(
        encodeFunctionData({
          abi: this.btg.abi,
          functionName: 'cancelBoost',
          args: [this.validator, parseUnits(amount, 18)],
        }),
        address,
      );
    } catch (error) {
      this.handleError('CANCEL_BOOST_ERROR', error);
    }
  }

  /**
   * Creates a transaction data for drop boost (unstake)
   *
   * @param address - The staker address
   * @param amount - The amount of boost (doesn't use for mainnet)
   * @returns A Promise that resolves to the transaction data
   *
   * @throws Will throw an error if the contract call fails.
   */
  public async unstake(address: string, amount: string): Promise<Transaction> {
    try {
      if (!isAddress(address)) {
        this.throwError('ADDRESS_FORMAT_ERROR');
      }

      let data: HexString;
      switch (this.btg.network) {
        case 'testnet':
          data = encodeFunctionData({
            abi: this.btg.abi,
            functionName: 'dropBoost',
            args: [this.validator, parseUnits(amount, 18)],
          });
          break;
        case 'mainnet':
          data = encodeFunctionData({
            abi: this.btg.abi,
            functionName: 'dropBoost',
            args: [address, this.validator],
          });
          break;
      }

      return await this.getTransaction(data, address);
    } catch (error) {
      this.handleError('DROP_BOOST_ERROR', error);
    }
  }

  /**
   * Creates a transaction data for boost (staking)
   *
   * @param address - The staker address
   * @param amount - The amount of boost
   * @returns A Promise that resolves to the transaction data
   *
   * @throws Will throw an error if the contract call fails.
   */
  public async stake(address: string, amount: string): Promise<Transaction> {
    try {
      if (!isAddress(address)) {
        this.throwError('ADDRESS_FORMAT_ERROR');
      }

      return await this.getTransaction(
        encodeFunctionData({
          abi: this.btg.abi,
          functionName: 'queueBoost',
          args: [this.validator, parseUnits(amount, 18)],
        }),
        address,
      );
    } catch (error) {
      this.handleError('BOOST_ERROR', error);
    }
  }

  /**
   * Creates a transaction data for queue drop boost (unstake queue)
   *
   * @param address - The staker address
   * @param amount - The amount of boost
   * @returns A Promise that resolves to the transaction data
   *
   * @throws Will throw an error if the contract call fails.
   */
  public async queueUnstake(
    address: HexString,
    amount: string,
  ): Promise<Transaction> {
    try {
      if (this.network !== 'mainnet') {
        this.throwError('NOT_AVAILABLE_NETWORK');
      }

      return await this.getTransaction(
        encodeFunctionData({
          abi: this.btg.abi,
          functionName: 'queueDropBoost',
          args: [this.validator, parseUnits(amount, 18)],
        }),
        address,
      );
    } catch (error) {
      this.handleError('QUEUE_DROP_BOOST_ERROR', error);
    }
  }

  /**
   * Creates a transaction data for cancel drop boost (cancel unstake queue)
   *
   * @param address - The staker address
   * @param amount - The amount of boost
   * @returns A Promise that resolves to the transaction data
   *
   * @throws Will throw an error if the contract call fails.
   */
  public async cancelUnstake(
    address: HexString,
    amount: string,
  ): Promise<Transaction> {
    try {
      if (this.network !== 'mainnet') {
        this.throwError('NOT_AVAILABLE_NETWORK');
      }

      return await this.getTransaction(
        encodeFunctionData({
          abi: this.btg.abi,
          functionName: 'cancelDropBoost',
          args: [this.validator, parseUnits(amount, 18)],
        }),
        address,
      );
    } catch (error) {
      this.handleError('CANCEL_DROP_BOOST_ERROR', error);
    }
  }

  private async getTransaction(
    data: HexString,
    address: HexString,
    value = new BigNumber(0),
  ): Promise<Transaction> {
    const gasConsumption = await this.client.estimateGas({
      to: this.btg.contractAddress,
      data,
      account: address,
    });

    return {
      from: address,
      to: this.btg.contractAddress,
      value,
      gasLimit: this.calculateGasLimit(gasConsumption),
      data,
    };
  }

  /**
   * Calculates the gas limit by adding a predefined BERA_GAS_RESERVE to the given gas consumption.
   *
   * @param gasConsumption - The amount of gas consumed.
   *
   * @returns The calculated gas limit as a number.
   */
  private calculateGasLimit(gasConsumption: bigint): number {
    return Number(gasConsumption) + GAS_RESERVE;
  }
}
