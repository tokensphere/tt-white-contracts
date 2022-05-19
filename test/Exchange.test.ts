import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { FakeContract, smock } from '@defi-wonderland/smock';
import { Exchange__factory, Exchange, Spc } from '../typechain-types';

describe('Exchange', () => {
  let spc: FakeContract<Spc>,
    exchangeFactory: Exchange__factory,
    exchange: Exchange;

  before(async () => {
    exchangeFactory = await ethers.getContractFactory('Exchange');
  });

  beforeEach(async () => {
    spc = await smock.fake('Spc');
    exchange = await upgrades.deployProxy(exchangeFactory, [spc.address]) as Exchange;
  });

  describe('initialize', async () => {
    it('Keeps track of the SPC contract');
  });
});
