# Everstake Wallet SDK

## Getting Started

You can use two different options to implement staking for Everstake validator.

## Option 1: REST API

You can use REST API to call methods which are described in [Swagger](https://wallet-sdk-api.everstake.one/swagger/) with detailed examples

```
https://wallet-sdk-api.everstake.one
```

## Option 2: TypeScript library

You can install and import Wallet SDK for Javascript/TypeScript.

### Step. 1: Installing the Library

Install the npm library by copying the code below.

```sh
$ npm install @temple-wallet/everstake-wallet-sdk
```

or you can also use yarn

```sh
$ yarn add @temple-wallet/everstake-wallet-sdk
```

or you can use pnpm

```sh
$ pnpm add @temple-wallet/everstake-wallet-sdk
```

### Step. 2: Import Wallet SDK

After installing the app, you can import module of needed blockchain (Ethereum, Polygon, Berrachain are available) and use the SDK:

#### Import ES6

```ts
// import modules
import { Ethereum } from '@temple-wallet/everstake-wallet-sdk';

// import needed functions
import { CreateToken, GetAssets } from '@temple-wallet/everstake-wallet-sdk';
```

#### Import ES5

```ts
// import modules
const { Ethereum, Solana } = require('@temple-wallet/everstake-wallet-sdk');

// import needed functions
const { CreateToken, GetAssets } = require('@temple-wallet/everstake-wallet-sdk');
```

## Questions and Feedback

If you have any questions, issues, or feedback, please file an issue
on [GitHub](https://github.com/madfish-solutions/everstake-wallet-sdk/issues).
