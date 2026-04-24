use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // Registration
    NotRegistered         = 1,
    AlreadyRegistered     = 2,
    AlreadyInitialized    = 3,

    // Auth
    NotGuardian           = 4,
    NotBeneficiary        = 5,
    CannotBeSelf          = 6,

    // State
    ProtocolActive        = 7,
    ProtocolDead          = 8,
    AlreadyDead           = 9,
    OwnerStillActive      = 10,
    GracePeriodExpired    = 11,
    VestingNotStarted     = 12,

    // Guardian limits
    GuardianExists        = 13,
    TooManyGuardians      = 14,
    GuardianNotFound      = 15,
    FixedGuardian         = 16,

    // Beneficiary limits
    BeneficiaryExists     = 17,
    TooManyBeneficiaries  = 18,
    BeneficiaryNotFound   = 19,
    ZeroAllocation        = 20,
    AllocationExceeds100  = 21,
    ZeroDuration          = 22,

    // Funds
    InvalidAmount         = 23,
    InsufficientBalance   = 24,
    NothingToClaim        = 25,
    VaultInsolvency       = 26,

    // Config
    ThresholdTooShort     = 27,
}
