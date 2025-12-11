use anchor_lang::prelude::*;
use arbitrary_cpi_expected::cpi::accounts::{InitializeSecret};


declare_id!("puZbSDM45vDHXpbMVaoL2h4B3KjYXs9q7SygubCq3yp");


#[program]
pub mod arbitrary_cpi{
    use super::*;

    pub fn initialize_secret(ctx: Context<InitializeSecretCPI>,pin1:u8,pin2:u8,pin3:u8,pin4:u8,) -> Result<()>{
        let cpi_program = ctx.accounts.secret_program.to_account_info();

        let cpi_accounts = InitializeSecret{
            author: ctx.accounts.author.to_account_info(),
            secret_information: ctx.accounts.secret_information.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program,cpi_accounts);

        arbitrary_cpi_expected::cpi::initialize_secret(cpi_ctx,pin1,pin2,pin3,pin4)?;

        msg!("PIN SET");

        Ok(())
    }
}


#[derive(Accounts)]
pub struct InitializeSecretCPI<'info>{
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(mut)]
    pub secret_information: AccountInfo<'info>,
    pub system_program: Program<'info,System>,
    /// CHECK: This is an arbitrary CPI attack demonstration - the program ID is intentionally unchecked
    pub secret_program: AccountInfo<'info>,
}