use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Token,Mint,TokenAccount,transfer,Transfer};

declare_id!("7b4eFt9GjjRnHptynRJNdjwXjjroX2kGY35YfQoXgFNo");

#[program]
pub mod pda_privileges{
    use super::*;

    //
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()>{
      let metadata_account = &mut ctx.accounts.metadata_account;
      metadata_account.creator = ctx.accounts.vault_creator.key();
      Ok(())
    }

    pub fn insecure_withdraw(ctx: Context<InsecureWithdraw>) -> Result<()> {
        let amount = ctx.accounts.vault.amount;
        let metadata_account = &mut ctx.accounts.metadata_account;

        let signer_seeds: &[&[&[u8]]] = &[&[b"metadata_account",metadata_account.creator.as_ref(),&[ctx.bumps.metadata_account]]];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer{
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.withdraw_destination.to_account_info(),
                authority: metadata_account.to_account_info(),
            },
            signer_seeds,
        );

        transfer(cpi_context,amount)?;
        Ok(())
    }

    pub fn secure_withdraw(ctx: Context<SecureWithdraw>) -> Result<()> {
        let amount = ctx.accounts.vault.amount;
        let metadata_account = &mut ctx.accounts.metadata_account;
        let signer_seeds: &[&[&[u8]]] = &[&[b"metadata_account",metadata_account.creator.as_ref(),&[ctx.bumps.metadata_account]]];


        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer{
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.withdraw_destination.to_account_info(),
                authority: metadata_account.to_account_info(),
            },
            signer_seeds,
        );

        transfer(cpi_context,amount)?;
        Ok(())
    }
}


#[derive(Accounts)]
pub struct SecureWithdraw<'info>{
    pub creator: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = metadata_account,
    )]
    pub vault: Account<'info,TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
    )]
    pub withdraw_destination: Account<'info,TokenAccount>,


    #[account(
        seeds = [b"metadata_account",metadata_account.creator.key().as_ref()],
        bump,
        has_one = creator,
    )]
    pub metadata_account:Account<'info,MetadataAccount>,


    pub mint: Account<'info,Mint>,

    pub token_program: Program<'info, Token>,
}



#[derive(Accounts)]
pub struct InsecureWithdraw<'info>{
    pub vault_creator: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = metadata_account,
    )]
    pub vault: Account<'info,TokenAccount>,


    #[account(
        mut,
        token::mint = mint,
    )]
    pub withdraw_destination: Account<'info,TokenAccount>,


    #[account(
        seeds = [b"metadata_account",metadata_account.creator.key().as_ref()],
        bump,
    )]
    pub metadata_account:Account<'info,MetadataAccount>,


    pub mint: Account<'info,Mint>,

    pub token_program: Program<'info, Token>,
}



#[derive(Accounts)]
pub struct InitializeVault<'info>{
    #[account(mut)]
    pub vault_creator: Signer<'info>,

    #[account(
        init,
        payer = vault_creator,
        associated_token::mint = mint,
        associated_token::authority = metadata_account,
    )]
    pub vault: Account<'info,TokenAccount>,


    #[account(
        init,
        payer = vault_creator,
        space = 8 + MetadataAccount::LEN,
        seeds = [b"metadata_account",vault_creator.key().as_ref()],
        bump,
    )]
    pub metadata_account:Account<'info,MetadataAccount>,


    pub mint: Account<'info,Mint>,

    pub system_program: Program<'info,System>,    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[account]
pub struct MetadataAccount{
    pub creator: Pubkey,
}

impl MetadataAccount{
    const LEN: usize = 32;
}
