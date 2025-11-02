// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface INameWrapper {
    function setSubnodeRecord(
        bytes32 parentNode,
        bytes32 label,
        address owner,
        address resolver,
        uint64 ttl,
        uint32 fuses,
        uint64 expiry
    ) external returns (bytes32 node);

    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IENSRegistry {
    function owner(bytes32 node) external view returns (address);
}

interface IResolver {
    function setAddr(bytes32 node, address a) external;
}

contract ENSSubnameRegistrar is Ownable {
    bytes32 public immutable parentNode;
    address public immutable nameWrapper;
    address public immutable publicResolver;
    IENSRegistry public immutable ensRegistry;

    mapping(bytes32 => address) public orgOwner; // labelhash => owner address
    mapping(bytes32 => mapping(address => bool)) public authorized; // labelhash => wallet => bool

    event OrgRegistered(string indexed ensLabel, address indexed owner, bytes32 indexed node);
    event WalletAuthorized(string indexed ensLabel, address indexed wallet);
    event WalletRevoked(string indexed ensLabel, address indexed wallet);

    error NotOrgOwner();
    error AlreadyRegistered();
    error InvalidParentNode();

    constructor(
        bytes32 _parentNode,
        address _nameWrapper,
        address _resolver,
        address _ensRegistry,
        address initialOwner
    ) Ownable(initialOwner) {
        parentNode = _parentNode;
        nameWrapper = _nameWrapper;
        publicResolver = _resolver;
        ensRegistry = IENSRegistry(_ensRegistry);

        // Note: We don't verify wrapped status in constructor to allow deployment
        // The registerOrg function will verify when attempting to register subdomains
    }

    /**
     * @dev Register a new organization subname under the parent
     * @param ensLabel The label for the subname (e.g., "acme" for acme.liquifi-sepolia.eth)
     * @param owner The address that will own this subname
     */
    function registerOrg(string memory ensLabel, address owner) external onlyOwner {
        bytes32 label = keccak256(bytes(ensLabel));
        bytes32 node = namehash(parentNode, label);

        // Check if already registered
        if (orgOwner[label] != address(0)) {
            revert AlreadyRegistered();
        }

        // Register subname via NameWrapper
        INameWrapper(nameWrapper).setSubnodeRecord(
            parentNode,
            label,
            owner,
            publicResolver,
            0, // ttl
            0, // fuses (no restrictions in MVP)
            0  // expiry (no expiry in MVP)
        );

        orgOwner[label] = owner;
        authorized[label][owner] = true;

        emit OrgRegistered(ensLabel, owner, node);
    }

    /**
     * @dev Authorize an additional wallet for an organization
     * @param ensLabel The ENS label of the organization
     * @param wallet The wallet address to authorize
     */
    function authorizeWallet(string memory ensLabel, address wallet) external {
        bytes32 label = keccak256(bytes(ensLabel));
        bytes32 fullNode = namehash(parentNode, label);

        // Check if caller is the org owner or current NameWrapper owner
        address currentOwner = orgOwner[label];
        address wrapperOwner = INameWrapper(nameWrapper).ownerOf(uint256(fullNode));

        if (msg.sender != currentOwner && msg.sender != wrapperOwner) {
            revert NotOrgOwner();
        }

        authorized[label][wallet] = true;
        emit WalletAuthorized(ensLabel, wallet);
    }

    /**
     * @dev Revoke authorization for a wallet
     * @param ensLabel The ENS label of the organization
     * @param wallet The wallet address to revoke
     */
    function revokeWallet(string memory ensLabel, address wallet) external {
        bytes32 label = keccak256(bytes(ensLabel));
        bytes32 fullNode = namehash(parentNode, label);

        // Check if caller is the org owner or current NameWrapper owner
        address currentOwner = orgOwner[label];
        address wrapperOwner = INameWrapper(nameWrapper).ownerOf(uint256(fullNode));

        if (msg.sender != currentOwner && msg.sender != wrapperOwner) {
            revert NotOrgOwner();
        }

        authorized[label][wallet] = false;
        emit WalletRevoked(ensLabel, wallet);
    }

    /**
     * @dev Check if a wallet is authorized for an organization
     * @param ensLabel The ENS label of the organization
     * @param wallet The wallet address to check
     * @return bool True if authorized
     */
    function isAuthorized(string memory ensLabel, address wallet) external view returns (bool) {
        bytes32 label = keccak256(bytes(ensLabel));
        return authorized[label][wallet] || orgOwner[label] == wallet;
    }

    /**
     * @dev Get the owner of an organization subname
     * @param ensLabel The ENS label of the organization
     * @return address The owner address
     */
    function getOrgOwner(string memory ensLabel) external view returns (address) {
        bytes32 label = keccak256(bytes(ensLabel));
        return orgOwner[label];
    }

    /**
     * @dev Internal helper to compute namehash
     */
    function namehash(bytes32 parent, bytes32 label) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(parent, label));
    }
}

