import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OwnershipCheck } from "../../target/types/ownership_check";
import {
  getOrCreateAssociatedTokenAccount,
  createMint,
  createAccount,
  mintTo,
} from "@solana/spl-token";

describe("ownership-check", () => {
  let provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OwnershipCheck as Program<OwnershipCheck>;

  const creator = web3.Keypair.generate();
  const hacker = web3.Keypair.generate();

  before("Fund the users!", async () => {
    await airdrop(provider.connection, creator.publicKey);
    await airdrop(provider.connection, hacker.publicKey);
  });


  // x x x x x x x x x x x x x x x x x x x x x
  // | | | | | | | | | | | | | | | | | | | | |
  //           ADD YOUR CODE BELOW
  // | | | | | | | | | | | | | | | | | | | | |
  // v v v v v v v v v v v v v v v v v v v v v
  it("Demonstrates ownership check vulnerability and fix", async () => {
    // Create a mint
    const mint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      9
    );

    // Create token accounts for creator and hacker
    const creatorTokenAccount = await createAccount(
      provider.connection,
      creator,
      mint,
      creator.publicKey
    );

    const hackerTokenAccount = await createAccount(
      provider.connection,
      hacker,
      mint,
      hacker.publicKey
    );

    // Mint tokens to creator's account (1000 tokens)
    await mintTo(
      provider.connection,
      creator,
      mint,
      creatorTokenAccount,
      creator,
      1000 * 10 ** 9
    );

    // Mint tokens to hacker's account (1 token)
    await mintTo(
      provider.connection,
      creator,
      mint,
      hackerTokenAccount,
      creator,
      1 * 10 ** 9
    );

    // Test 1: Insecure v1 - Hacker can pass creator's token account
    // The program doesn't verify that the token account actually belongs to the signer
    // So hacker signs as themselves but passes creator's (richer) account
    // Impact: Program logs creator's balance but attributes it to hacker,
    //         making hacker appear richer than they are. This could bypass
    //         balance-based access controls in real applications.
    console.log("\n=== Testing Insecure v1 ===");
    try {
      await program.methods
        .insecureLogBalanceV1()
        .accounts({
          mint: mint,
          tokenAccount: creatorTokenAccount, // Hacker passes creator's account (with 1000 tokens)
          tokenAccountOwner: hacker.publicKey, // But signs as hacker (who only has 1 token)
        })
        .signers([hacker])
        .rpc();
      console.log("✓ Insecure v1: Attack succeeded - creator's balance (1000) logged as hacker's");
    } catch (err) {
      console.log("✗ Insecure v1 failed:", err);
    }

    // Test 2: Insecure v2 - Same vulnerability, using AccountInfo
    // Even worse: uses AccountInfo without any type checking, making it easier to exploit
    console.log("\n=== Testing Insecure v2 ===");
    try {
      await program.methods
        .insecureLogBalanceV2()
        .accounts({
          mint: mint,
          tokenAccount: creatorTokenAccount, // Hacker passes creator's account (with 1000 tokens)
          tokenAccountOwner: hacker.publicKey, // But signs as hacker (who only has 1 token)
        })
        .signers([hacker])
        .rpc();
      console.log("✓ Insecure v2: Attack succeeded - creator's balance (1000) logged as hacker's");
    } catch (err) {
      console.log("✗ Insecure v2 failed:", err);
    }

    // Test 3: Secure v1 - Should prevent the attack
    console.log("\n=== Testing Secure v1 ===");
    try {
      await program.methods
        .secureLogBalanceV1()
        .accounts({
          mint: mint,
          tokenAccount: creatorTokenAccount, // Hacker tries to pass creator's account
          tokenAccountOwner: hacker.publicKey, // But signs as hacker
        })
        .signers([hacker])
        .rpc();
      console.log("✗ Secure v1: Attack should have failed but didn't!");
    } catch (err) {
      console.log("✓ Secure v1: Attack prevented - Anchor constraints verified ownership");
    }

    // Test 4: Secure v1 - Should work correctly with creator's actual token account
    console.log("\n=== Testing Secure v1 (correct usage) ===");
    try {
      await program.methods
        .secureLogBalanceV1()
        .accounts({
          mint: mint,
          tokenAccount: creatorTokenAccount, // Creator's actual account
          tokenAccountOwner: creator.publicKey,
        })
        .signers([creator])
        .rpc();
      console.log("✓ Secure v1: Correct usage works");
    } catch (err) {
      console.log("✗ Secure v1 correct usage failed:", err);
    }

    // Test 5: Secure v2 - Should prevent the attack using associated token constraints
    console.log("\n=== Testing Secure v2 ===");
    // Create associated token accounts for both users
    const creatorAssociatedTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      creator,
      mint,
      creator.publicKey
    );
    const hackerAssociatedTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      hacker,
      mint,
      hacker.publicKey
    );
    
    // Mint some tokens to the associated token accounts
    await mintTo(
      provider.connection,
      creator,
      mint,
      creatorAssociatedTokenAccountInfo.address,
      creator,
      500 * 10 ** 9
    );
    
    const creatorAssociatedTokenAccount = creatorAssociatedTokenAccountInfo.address;
    const hackerAssociatedTokenAccount = hackerAssociatedTokenAccountInfo.address;

    try {
      await program.methods
        .secureLogBalanceV2()
        .accounts({
          mint: mint,
          tokenAccount: creatorAssociatedTokenAccount, // Hacker tries to pass creator's associated account
          tokenAccountOwner: hacker.publicKey, // But signs as hacker
        })
        .signers([hacker])
        .rpc();
      console.log("✗ Secure v2: Attack should have failed but didn't!");
    } catch (err) {
      console.log("✓ Secure v2: Attack prevented - Associated token constraints verified ownership");
    }

    // Test 6: Secure v2 - Should work correctly with creator's associated token account
    console.log("\n=== Testing Secure v2 (correct usage) ===");
    try {
      await program.methods
        .secureLogBalanceV2()
        .accounts({
          mint: mint,
          tokenAccount: creatorAssociatedTokenAccount, // Creator's actual associated account
          tokenAccountOwner: creator.publicKey,
        })
        .signers([creator])
        .rpc();
      console.log("✓ Secure v2: Correct usage works");
    } catch (err) {
      console.log("✗ Secure v2 correct usage failed:", err);
    }
  })
  // ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^
  // | | | | | | | | | | | | | | | | | | | | |
  //           ADD YOUR CODE ABOVE
  // | | | | | | | | | | | | | | | | | | | | |
  // x x x x x x x x x x x x x x x x x x x x x


});
export async function airdrop(
  connection: any,
  address: any,
  amount = 500_000_000_000
) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    'confirmed'
  );
}
