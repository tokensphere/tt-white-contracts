import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

// Tasks.

task('accounts', 'Prints the list of accounts', async (params, hre) => {
  const accounts = await hre.ethers.getSigners();
  accounts.forEach((account) => console.log(account.address))
});

task('make-us-rich', 'Adds ether to all signers', async (params, hre) => {
  const signers = await hre.ethers.getSigners();
  return await Promise.all(
    signers.map(async ({ address }) =>
      hre.network.provider.send("hardhat_setBalance", [address, '0xC9F2C9CD04674EDEA40000000'])
    ));
});

task('faucet', 'Sends ETH towards a given account')
  .addPositionalParam('account', 'The address that will receive them', undefined, types.string)
  .setAction(async ({ account }, hre) => {
    const receipt = await provisionEth(hre, account);
    console.log(`Transferred 1 ETH to ${account}: ${receipt.transactionHash}`);
  });

// Reusable functions.

async function provisionEth({ ethers }: HardhatRuntimeEnvironment, account: string) {
  const [sender] = await ethers.getSigners();
  const ethTx = await sender.sendTransaction({ to: account, value: ethers.constants.WeiPerEther, })
  return ethTx.wait();
}

export { provisionEth };
