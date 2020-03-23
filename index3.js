import { Wallet, utils } from "fuel-core";

const { faucet, transfer, listen, tokens, balance, address } = new Wallet({
   signer: new utils.SigningKey(utils.randomBytes(32)),
});

(async () => {
  await listen(async () => {
    console.log(await balance(tokens.fakeDai));
  });

  await faucet();

  await transfer(500, tokens.fakeDai, address);

  console.log('Yay, we transfered to ourself!");
})();
