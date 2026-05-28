/**
 * Unit + behavioural tests for the ENCL utility token. This is the
 * canonical test suite for the contract — the RWA project's
 * StakingBond imports the compiled artifact from `@enclaves/encl` and
 * re-tests against it through its own bond-flow tests; everything that
 * is purely about ENCL semantics lives here.
 */

import { ethers } from 'hardhat';
import { expect } from 'chai';

import type { ENCL } from '../typechain-types';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

const ZERO = ethers.ZeroAddress;
const TOTAL_SUPPLY_WHOLE = 1_000_000_000n; // 1B whole ENCL
const TOTAL_SUPPLY = ethers.parseEther(TOTAL_SUPPLY_WHOLE.toString());

describe('ENCL', () => {
  let deployer: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;

  let encl: ENCL;
  let enclAddress: string;

  beforeEach(async () => {
    [deployer, treasury, alice, bob, carol] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('ENCL', deployer);
    encl = await Factory.deploy(treasury.address, TOTAL_SUPPLY);
    await encl.waitForDeployment();
    enclAddress = await encl.getAddress();
  });

  describe('initial state', () => {
    it('has the canonical name + symbol + 18 decimals', async () => {
      expect(await encl.name()).to.equal('Enclaves');
      expect(await encl.symbol()).to.equal('ENCL');
      expect(await encl.decimals()).to.equal(18n);
    });

    it('mints the full supply to the treasury', async () => {
      expect(await encl.totalSupply()).to.equal(TOTAL_SUPPLY);
      expect(await encl.balanceOf(treasury.address)).to.equal(TOTAL_SUPPLY);
    });

    it('rejects deployment with the zero treasury', async () => {
      const Factory = await ethers.getContractFactory('ENCL', deployer);
      await expect(
        Factory.deploy(ZERO, ethers.parseEther('1'))
      ).to.be.revertedWith('bad treasury');
    });

    it('exposes no public mint function (fixed supply)', () => {
      // `mint` is intentionally absent from the contract; the typed ABI
      // therefore has no such method.
      expect((encl as unknown as Record<string, unknown>).mint).to.equal(undefined);
    });

    it('supports zero initial supply (degenerate but legal)', async () => {
      const Factory = await ethers.getContractFactory('ENCL', deployer);
      const zeroEncl = await Factory.deploy(treasury.address, 0);
      await zeroEncl.waitForDeployment();
      expect(await zeroEncl.totalSupply()).to.equal(0n);
      expect(await zeroEncl.balanceOf(treasury.address)).to.equal(0n);
    });
  });

  describe('ERC-20 transfers', () => {
    it('moves balance between accounts', async () => {
      const hundred = ethers.parseEther('100');
      const twentyFive = ethers.parseEther('25');
      await encl.connect(treasury).transfer(alice.address, hundred);
      expect(await encl.balanceOf(alice.address)).to.equal(hundred);

      await encl.connect(alice).transfer(bob.address, twentyFive);
      expect(await encl.balanceOf(alice.address)).to.equal(hundred - twentyFive);
      expect(await encl.balanceOf(bob.address)).to.equal(twentyFive);
    });

    it('respects ERC-20 allowance semantics', async () => {
      const hundred = ethers.parseEther('100');
      const forty = ethers.parseEther('40');
      const thirty = ethers.parseEther('30');
      await encl.connect(treasury).transfer(alice.address, hundred);
      await encl.connect(alice).approve(bob.address, forty);
      expect(await encl.allowance(alice.address, bob.address)).to.equal(forty);
      await encl.connect(bob).transferFrom(alice.address, bob.address, thirty);
      expect(await encl.balanceOf(bob.address)).to.equal(thirty);
      expect(await encl.allowance(alice.address, bob.address)).to.equal(forty - thirty);
    });

    it('reverts on insufficient balance', async () => {
      await expect(
        encl.connect(alice).transfer(bob.address, ethers.parseEther('1'))
      ).to.be.reverted;
    });

    it('emits Transfer on every move', async () => {
      const five = ethers.parseEther('5');
      await expect(encl.connect(treasury).transfer(alice.address, five))
        .to.emit(encl, 'Transfer')
        .withArgs(treasury.address, alice.address, five);
    });
  });

  describe('ERC-2612 permit', () => {
    it('exposes the EIP-2612 nonce and DOMAIN_SEPARATOR', async () => {
      expect(await encl.nonces(treasury.address)).to.equal(0n);
      const sep = await encl.DOMAIN_SEPARATOR();
      expect(sep).to.match(/^0x[0-9a-f]{64}$/i);
    });

    it('grants allowance via off-chain signature (gasless approval)', async () => {
      // Create an in-process keypair we fully control so we can sign
      // EIP-712 payloads without depending on the test chain's private
      // keys. The wallet is then funded with ENCL by the treasury and a
      // little ETH by the deployer to act as the `owner` in the permit.
      const signer = ethers.Wallet.createRandom().connect(ethers.provider);
      const grant = ethers.parseEther('500');
      const value = ethers.parseEther('123');
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      await encl.connect(treasury).transfer(signer.address, grant);
      await deployer.sendTransaction({
        to: signer.address,
        value: ethers.parseEther('1'),
      });

      const { chainId } = await ethers.provider.getNetwork();
      const nonce = await encl.nonces(signer.address);

      // Build & sign the EIP-712 Permit payload ourselves so the test
      // exercises the same on-chain verification path that any wallet /
      // dApp would. ethers.Wallet.signTypedData implements EIP-712 v4.
      const domain = {
        name: 'Enclaves',
        version: '1',
        chainId,
        verifyingContract: enclAddress,
      };
      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      };
      const message = {
        owner: signer.address,
        spender: bob.address,
        value,
        nonce,
        deadline,
      };

      const sig = await signer.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(sig);

      // Anyone (here: carol) may submit the permit on the signer's behalf.
      await encl.connect(carol).permit(signer.address, bob.address, value, deadline, v, r, s);

      expect(await encl.allowance(signer.address, bob.address)).to.equal(value);
      expect(await encl.nonces(signer.address)).to.equal(1n);

      // bob spends the granted allowance.
      await encl.connect(bob).transferFrom(signer.address, bob.address, value);
      expect(await encl.balanceOf(bob.address)).to.equal(value);
    });

    it('rejects expired permits', async () => {
      const past = BigInt(Math.floor(Date.now() / 1000) - 3600);
      const zero32 = '0x' + '0'.repeat(64);
      await expect(
        encl.connect(carol).permit(
          alice.address,
          bob.address,
          ethers.parseEther('1'),
          past,
          27,
          zero32,
          zero32
        )
      ).to.be.reverted;
    });
  });
});
