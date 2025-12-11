//Account data: 字节数组  -反序列化》结构体

use anchor_lang::prelude::*;

declare_id!("DvfEttKg2MprhUAE3LHoicZMy7dKduD7psKLgbJP5Dsk");

#[program]
pub mod type_cosplay{
    use super::*;

    pub fn insecure_user_read(ctx:Context<InsecureTypeCosplay>) -> Result<()>{
        // Skip the 8-byte discriminator when reading account data
        let account_data = ctx.accounts.user.data.borrow();
        if account_data.len() < 8 + User::LEN {
            return Err(ProgramError::InvalidAccountData.into());
        }
        let user_data = &account_data[8..8+User::LEN];
        let user = User::try_from_slice(user_data)?;

        if user.authority != ctx.accounts.authority.key(){
            return Err(ProgramError::InvalidAccountData.into());
        }

         msg!(
          "The Age of the User: {} is: {}",
            ctx.accounts.authority.key(),
            user.age
         );

        Ok(())
    }

    pub fn write_account_data(ctx: Context<WriteAccountData>, data: Vec<u8>) -> Result<()> {
        // Ensure the account is owned by this program
        if ctx.accounts.account.owner != ctx.program_id {
            return Err(ProgramError::IllegalOwner.into());
        }
        // Ensure we don't write beyond account size
        if data.len() > ctx.accounts.account.data_len() {
            return Err(ProgramError::InvalidAccountData.into());
        }
        let account_data = &mut ctx.accounts.account.data.borrow_mut();
        account_data[..data.len()].copy_from_slice(&data);
        Ok(())
    }

}

pub fn secure_user_read(ctx: Context<SecureTypeCosplay>) -> Result<()>{
    let user = &ctx.accounts.user;

    msg!(
        "The Age of the User: {} is: {}",
        ctx.accounts.authority.key(),
        user.age
    );
    Ok(())
}


#[derive(Accounts)]
pub struct InsecureTypeCosplay<'info>{
    ///CHECK:
    pub user:AccountInfo<'info>,
    pub authority: Signer<'info>,
}


#[derive(Accounts)]
pub struct SecureTypeCosplay<'info>{
    //- "这个类型会告诉 Anchor：'我只接受 User 类型的账户'"
    // - "Anchor 会在账户验证阶段自动检查类型"
    #[account(
        has_one = authority,
    )]
    pub user:Account<'info,User>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WriteAccountData<'info> {
    ///CHECK: This is a helper instruction to write account data for testing the type cosplay attack
    #[account(mut)]
    pub account: AccountInfo<'info>,
    pub authority: Signer<'info>,
}


#[account]
pub struct User{
    pub authority: Pubkey,
    pub metadata_account: Pubkey,
    pub age: u32,
} //68bytes 

impl User{
    pub const LEN:usize = 32 + 32 + 4;
}

#[account]
pub struct UserMetadata{
    pub authority: Pubkey,
    pub user_account: Pubkey,
    pub pin1: u8,
    pub pin2: u8,
    pub pin3: u8,
    pub pin4: u8,
}

impl UserMetadata{
    pub const LEN:usize = 32 + 32 + 1 + 1 + 1 + 1;
}
