// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AfterLife - Multi-Tenant Crypto Will Protocol (Security Hardened + Error Handling Fixed)
/// @notice Allows multiple users to register their own protocol instances with proper fund isolation
contract AfterLife {
    
    // --- Constants ---
    uint256 public constant MIN_THRESHOLD = 1 minutes;
    uint256 public constant MAX_GUARDIANS = 10;
    uint256 public constant MAX_BENEFICIARIES = 20;
    uint256 public constant REVIVE_GRACE_PERIOD = 7 days;
    
    // Platform Fee: 10% (1000 basis points)
    uint256 public constant PLATFORM_FEE_BPS = 1000;
    address public constant PLATFORM_WALLET = 0xFE13B060897b5daBbC866C312A6839C007d181fB;

    // --- Structs ---

    struct Guardian {
        string name;
        address wallet;
        bool isFixed;
    }

    struct Beneficiary {
        string name;
        address wallet;
        uint256 allocation;
        uint256 amountClaimed;
        VestingType vestingType;
        uint256 vestingDuration;
    }

    struct Protocol {
        bool isRegistered;
        uint256 lastHeartbeat;
        uint256 inactivityThreshold;
        bool isDead;
        uint256 initialVaultBalance;
        uint256 vestingStartTime;
        uint256 totalAllocation;
        uint256 deathDeclarationTime;
    }

    enum VestingType { LINEAR, CLIFF }

    // --- State Variables ---

    mapping(address => Protocol) public protocols;
    mapping(address => uint256) public ownerBalances;
    mapping(address => mapping(address => Guardian)) public guardians;
    mapping(address => address[]) public guardianLists;
    mapping(address => mapping(address => Beneficiary)) public beneficiaries;
    mapping(address => address[]) public beneficiaryLists;

    bool private locked;

    // --- Custom Errors (Gas Efficient) ---
    error NotRegistered();
    error AlreadyRegistered();
    error NotGuardian();
    error NotBeneficiary();
    error ProtocolActive();
    error ProtocolDead();
    error VestingNotStarted();
    error GracePeriodExpired();
    error ZeroAddress();
    error EmptyString();
    error NoReentrancy();
    error GuardianExists();
    error TooManyGuardians();
    error CannotBeSelf();
    error BeneficiaryExists();
    error TooManyBeneficiaries();
    error ZeroAllocation();
    error AllocationExceeds100Percent();
    error ZeroDuration();
    error GuardianNotFound();
    error FixedGuardian();
    error BeneficiaryNotFound();
    error NoValue();
    error ZeroAmount();
    error InsufficientBalance();
    error OwnerStillActive();
    error AlreadyDead();
    error NothingToClaim();
    error VaultInsolvency();
    error IndexOutOfBounds();
    error ThresholdTooShort();

    // --- Events ---
    event ProtocolRegistered(address indexed owner, uint256 threshold);
    event Pulse(address indexed owner, uint256 timestamp);
    event InactivityConfirmed(address indexed owner, uint256 timestamp);
    event ProtocolRevived(address indexed owner, uint256 timestamp);
    event BeneficiaryAdded(address indexed owner, address indexed wallet, uint256 allocation);
    event BeneficiaryRemoved(address indexed owner, address indexed wallet);
    event GuardianAdded(address indexed owner, address indexed wallet);
    event GuardianRemoved(address indexed owner, address indexed wallet);
    event GuardianFixedStatusChanged(address indexed owner, address indexed wallet, bool isFixed);
    event FundsClaimed(address indexed owner, address indexed beneficiary, uint256 amount);
    event FundsDeposited(address indexed owner, uint256 amount);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event PlatformFeeCollected(address indexed owner, address indexed beneficiary, uint256 feeAmount);

    // --- Modifiers ---

    modifier onlyRegistered() {
        if (!protocols[msg.sender].isRegistered) revert NotRegistered();
        _;
    }

    modifier onlyGuardianOf(address _owner) {
        if (guardians[_owner][msg.sender].wallet == address(0)) revert NotGuardian();
        _;
    }

    modifier onlyWhileExecuting(address _owner) {
        Protocol storage p = protocols[_owner];
        if (!p.isDead) revert ProtocolActive();
        if (p.vestingStartTime == 0) revert VestingNotStarted();
        // Grace period allows claiming - owner can revive but claimed funds stay with beneficiary
        _;
    }

    modifier nonReentrant() {
        if (locked) revert NoReentrancy();
        locked = true;
        _;
        locked = false;
    }

    modifier validAddress(address _addr) {
        if (_addr == address(0)) revert ZeroAddress();
        _;
    }

    modifier nonEmptyString(string memory _str) {
        if (bytes(_str).length == 0) revert EmptyString();
        _;
    }

    // --- Registration ---

    function register(uint256 _thresholdSeconds) external {
        if (protocols[msg.sender].isRegistered) revert AlreadyRegistered();
        
        // User-configurable threshold (minimum 1 minute)
        if (_thresholdSeconds < MIN_THRESHOLD) revert ThresholdTooShort();

        protocols[msg.sender] = Protocol({
            isRegistered: true,
            lastHeartbeat: block.timestamp,
            inactivityThreshold: _thresholdSeconds,
            isDead: false,
            initialVaultBalance: 0,
            vestingStartTime: 0,
            totalAllocation: 0,
            deathDeclarationTime: 0
        });

        emit ProtocolRegistered(msg.sender, _thresholdSeconds);
    }

    function updateInactivityThreshold(uint256 _newThreshold) external onlyRegistered {
        // User-configurable threshold (minimum 1 minute)
        if (_newThreshold < MIN_THRESHOLD) revert ThresholdTooShort();
        
        protocols[msg.sender].inactivityThreshold = _newThreshold;
        emit ProtocolRegistered(msg.sender, _newThreshold); // Re-use event for simplicity
    }

    // --- Owner Actions ---

    function proveLife() external onlyRegistered {
        Protocol storage p = protocols[msg.sender];
        
        if (p.isDead) {
            if (block.timestamp > p.deathDeclarationTime + REVIVE_GRACE_PERIOD) {
                revert GracePeriodExpired();
            }
            
            p.isDead = false;
            p.vestingStartTime = 0;
            p.initialVaultBalance = 0;
            p.deathDeclarationTime = 0;
            p.lastHeartbeat = block.timestamp;
            
            address[] storage beneficiaryList = beneficiaryLists[msg.sender];
            uint256 length = beneficiaryList.length;
            for (uint256 i = 0; i < length; i++) {
                beneficiaries[msg.sender][beneficiaryList[i]].amountClaimed = 0;
            }
            
            emit ProtocolRevived(msg.sender, block.timestamp);
            return;
        }
        
        p.lastHeartbeat = block.timestamp;
        emit Pulse(msg.sender, block.timestamp);
    }

    function addGuardian(string memory _name, address _wallet) 
        external 
        onlyRegistered 
        validAddress(_wallet)
        nonEmptyString(_name)
    {
        if (guardians[msg.sender][_wallet].wallet != address(0)) revert GuardianExists();
        if (guardianLists[msg.sender].length >= MAX_GUARDIANS) revert TooManyGuardians();
        if (_wallet == msg.sender) revert CannotBeSelf();
        
        guardians[msg.sender][_wallet] = Guardian({
            name: _name,
            wallet: _wallet,
            isFixed: false
        });
        guardianLists[msg.sender].push(_wallet);
        
        emit GuardianAdded(msg.sender, _wallet);
    }

    function addBeneficiary(
        string memory _name,
        address _wallet,
        uint256 _allocationBps,
        VestingType _vestingType,
        uint256 _duration
    ) 
        external 
        onlyRegistered 
        validAddress(_wallet)
        nonEmptyString(_name)
    {
        if (beneficiaries[msg.sender][_wallet].wallet != address(0)) revert BeneficiaryExists();
        if (beneficiaryLists[msg.sender].length >= MAX_BENEFICIARIES) revert TooManyBeneficiaries();
        if (_allocationBps == 0) revert ZeroAllocation();
        if (protocols[msg.sender].totalAllocation + _allocationBps > 10000) revert AllocationExceeds100Percent();
        if (_duration == 0) revert ZeroDuration();

        beneficiaries[msg.sender][_wallet] = Beneficiary({
            name: _name,
            wallet: _wallet,
            allocation: _allocationBps,
            amountClaimed: 0,
            vestingType: _vestingType,
            vestingDuration: _duration
        });
        beneficiaryLists[msg.sender].push(_wallet);
        protocols[msg.sender].totalAllocation += _allocationBps;

        emit BeneficiaryAdded(msg.sender, _wallet, _allocationBps);
    }

    function setGuardianFixed(address _guardian, bool _fixed) external onlyRegistered {
        if (guardians[msg.sender][_guardian].wallet == address(0)) revert GuardianNotFound();
        guardians[msg.sender][_guardian].isFixed = _fixed;
        emit GuardianFixedStatusChanged(msg.sender, _guardian, _fixed);
    }

    function removeGuardian(address _guardian) external onlyRegistered {
        if (guardians[msg.sender][_guardian].wallet == address(0)) revert GuardianNotFound();
        if (guardians[msg.sender][_guardian].isFixed) revert FixedGuardian();

        delete guardians[msg.sender][_guardian];

        address[] storage list = guardianLists[msg.sender];
        uint256 length = list.length;
        for (uint256 i = 0; i < length; i++) {
            if (list[i] == _guardian) {
                list[i] = list[length - 1];
                list.pop();
                break;
            }
        }

        emit GuardianRemoved(msg.sender, _guardian);
    }

    function removeBeneficiary(address _beneficiary) external onlyRegistered {
        if (beneficiaries[msg.sender][_beneficiary].wallet == address(0)) revert BeneficiaryNotFound();

        uint256 allocationToRemove = beneficiaries[msg.sender][_beneficiary].allocation;
        protocols[msg.sender].totalAllocation -= allocationToRemove;

        delete beneficiaries[msg.sender][_beneficiary];

        address[] storage list = beneficiaryLists[msg.sender];
        uint256 length = list.length;
        for (uint256 i = 0; i < length; i++) {
            if (list[i] == _beneficiary) {
                list[i] = list[length - 1];
                list.pop();
                break;
            }
        }

        emit BeneficiaryRemoved(msg.sender, _beneficiary);
    }

    function deposit() external payable onlyRegistered {
        if (msg.value == 0) revert NoValue();
        
        ownerBalances[msg.sender] += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }

    function withdraw(uint256 _amount) external onlyRegistered nonReentrant {
        if (protocols[msg.sender].isDead) revert ProtocolDead();
        if (_amount == 0) revert ZeroAmount();
        if (ownerBalances[msg.sender] < _amount) revert InsufficientBalance();
        
        ownerBalances[msg.sender] -= _amount;
        
        // Use call instead of transfer for better gas handling
        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(msg.sender, _amount);
    }

    // --- Guardian Actions ---

    function confirmInactivity(address _owner) external onlyGuardianOf(_owner) {
        Protocol storage p = protocols[_owner];
        if (!p.isRegistered) revert NotRegistered();
        if (p.isDead) revert AlreadyDead();

        // Use user-configured threshold directly
        if (block.timestamp <= p.lastHeartbeat + p.inactivityThreshold) revert OwnerStillActive();

        p.isDead = true;
        p.vestingStartTime = block.timestamp;
        p.deathDeclarationTime = block.timestamp;
        p.initialVaultBalance = ownerBalances[_owner];

        emit InactivityConfirmed(_owner, block.timestamp);
    }

    // --- Beneficiary Actions ---

    function claim(address _owner) external nonReentrant onlyWhileExecuting(_owner) {
        Beneficiary storage b = beneficiaries[_owner][msg.sender];
        if (b.wallet != msg.sender) revert NotBeneficiary();

        Protocol storage p = protocols[_owner];
        uint256 totalEntitlement = (p.initialVaultBalance * b.allocation) / 10000;
        uint256 vestedAmount = 0;

        uint256 elapsed = block.timestamp - p.vestingStartTime;

        if (b.vestingType == VestingType.CLIFF) {
            if (elapsed >= b.vestingDuration) {
                vestedAmount = totalEntitlement;
            }
        } else {
            if (elapsed >= b.vestingDuration) {
                vestedAmount = totalEntitlement;
            } else {
                vestedAmount = (totalEntitlement * elapsed) / b.vestingDuration;
            }
        }

        uint256 claimable = 0;
        if (vestedAmount > b.amountClaimed) {
            claimable = vestedAmount - b.amountClaimed;
        }

        if (claimable == 0) revert NothingToClaim();
        if (ownerBalances[_owner] < claimable) revert VaultInsolvency();

        b.amountClaimed += claimable;
        ownerBalances[_owner] -= claimable;
        
        // Calculate platform fee (10%)
        uint256 platformFee = (claimable * PLATFORM_FEE_BPS) / 10000;
        uint256 beneficiaryAmount = claimable - platformFee;
        
        // Transfer to beneficiary (90%)
        (bool success, ) = payable(b.wallet).call{value: beneficiaryAmount}("");
        require(success, "Beneficiary transfer failed");
        
        // Transfer platform fee (10%)
        (bool feeSuccess, ) = payable(PLATFORM_WALLET).call{value: platformFee}("");
        require(feeSuccess, "Fee transfer failed");

        emit FundsClaimed(_owner, b.wallet, claimable);
        emit PlatformFeeCollected(_owner, msg.sender, platformFee);
    }

    // --- View Functions ---

    function getOwnerBalance(address _owner) external view returns (uint256) {
        return ownerBalances[_owner];
    }

    function getReviveStatus(address _owner) external view returns (bool canRevive, uint256 timeRemaining) {
        Protocol storage p = protocols[_owner];
        
        if (!p.isDead) {
            return (false, 0);
        }
        
        uint256 graceEndTime = p.deathDeclarationTime + REVIVE_GRACE_PERIOD;
        
        if (block.timestamp >= graceEndTime) {
            return (false, 0);
        }
        
        return (true, graceEndTime - block.timestamp);
    }

    function getGuardianCount(address _owner) external view returns (uint256) {
        return guardianLists[_owner].length;
    }

    function getBeneficiaryCount(address _owner) external view returns (uint256) {
        return beneficiaryLists[_owner].length;
    }

    function getGuardianAt(address _owner, uint256 _index) external view returns (address) {
        if (_index >= guardianLists[_owner].length) revert IndexOutOfBounds();
        return guardianLists[_owner][_index];
    }

    function getBeneficiaryAt(address _owner, uint256 _index) external view returns (address) {
        if (_index >= beneficiaryLists[_owner].length) revert IndexOutOfBounds();
        return beneficiaryLists[_owner][_index];
    }

    function isOwner(address _addr) external view returns (bool) {
        return protocols[_addr].isRegistered;
    }

    function getClaimableAmount(address _owner, address _beneficiary) 
        external 
        view 
        returns (uint256 claimable, uint256 totalEntitlement, uint256 alreadyClaimed) 
    {
        Protocol storage p = protocols[_owner];
        Beneficiary storage b = beneficiaries[_owner][_beneficiary];
        
        if (!p.isDead) revert ProtocolActive();
        if (b.wallet == address(0)) revert NotBeneficiary();
        
        // NOTE: Grace period check removed to allow immediate claims after inactivity confirmation
        // The actual claim() function allows claiming during grace period, so this view should match
        
        totalEntitlement = (p.initialVaultBalance * b.allocation) / 10000;
        alreadyClaimed = b.amountClaimed;
        
        uint256 elapsed = block.timestamp - p.vestingStartTime;
        uint256 vestedAmount = 0;
        
        if (b.vestingType == VestingType.CLIFF) {
            if (elapsed >= b.vestingDuration) {
                vestedAmount = totalEntitlement;
            }
        } else {
            if (elapsed >= b.vestingDuration) {
                vestedAmount = totalEntitlement;
            } else {
                vestedAmount = (totalEntitlement * elapsed) / b.vestingDuration;
            }
        }
        
        if (vestedAmount > alreadyClaimed) {
            claimable = vestedAmount - alreadyClaimed;
        }
    }

    // --- Receive ETH ---
    receive() external payable onlyRegistered {
        if (msg.value == 0) revert NoValue();
        ownerBalances[msg.sender] += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }
}