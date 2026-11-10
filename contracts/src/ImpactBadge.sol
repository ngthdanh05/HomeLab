// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ProductType, IImpactBadge} from "./interfaces/IMarketPlaceDeps.sol";

/// @title ImpactBadge
/// @notice ERC-721 Proof of Action badges.
/// @dev Minting requires MINTER_ROLE. Token ids start at 1.
contract ImpactBadge is ERC721, ERC721URIStorage, AccessControl, IImpactBadge {
    enum BadgeType {
        ECO_CHECKIN,
        ZERO_CARBON,
        CULTURE_GUARDIAN,
        COMMUNITY_DONOR
    }

    struct Badge {
        BadgeType badgeType;
        uint256 issuedAt;
        address recipient;
    }

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev Inline metadata, independent of IPFS gateways.
    string public constant DEFAULT_METADATA_URI =
        "data:application/json;base64,eyJuYW1lIjoiTXlIb21lTGFiIEltcGFjdCBCYWRnZSIsImRlc2NyaXB0aW9uIjoiUHJvb2Ygb2YgQWN0aW9uIGJhZGdlIGlzc3VlZCBieSBNeUhvbWVMYWIuIn0=";

    /// @dev Next token id (starts at 1).
    uint256 private _nextTokenId = 1;

    /// @notice On-chain badge data by token id.
    mapping(uint256 tokenId => Badge) private _badges;

    event BadgeMinted(address indexed to, uint256 tokenId, BadgeType badgeType);

    error EmptyMetadataURI();
    error BadgeDoesNotExist(uint256 tokenId);

    /// @param admin Receives DEFAULT_ADMIN_ROLE and the initial MINTER_ROLE.
    constructor(address admin) ERC721("Impact Badge", "IMPACT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /// @notice Mints a badge for a purchase of `pType`.
    function mint(address to, ProductType pType) external override onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        BadgeType bType;
        if (pType == ProductType.Handicraft) {
            bType = BadgeType.ECO_CHECKIN;
        } else if (pType == ProductType.Food) {
            // ZERO_CARBON is reserved for CarbonOffset.
            bType = BadgeType.CULTURE_GUARDIAN;
        } else {
            bType = BadgeType.CULTURE_GUARDIAN;
        }
        return _mintBadgeInternal(to, bType, DEFAULT_METADATA_URI);
    }

    /// @notice Mints a badge with a custom URI.
    /// @param to Recipient.
    /// @param badgeType Badge type.
    /// @param metadataURI Metadata URI.
    /// @return tokenId The minted badge.
    function mintBadge(address to, BadgeType badgeType, string calldata metadataURI)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256 tokenId)
    {
        return _mintBadgeInternal(to, badgeType, metadataURI);
    }

    function _mintBadgeInternal(address to, BadgeType badgeType, string memory metadataURI)
        internal
        returns (uint256 tokenId)
    {
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();

        tokenId = _nextTokenId++;

        _badges[tokenId] = Badge({badgeType: badgeType, issuedAt: block.timestamp, recipient: to});

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit BadgeMinted(to, tokenId, badgeType);
    }

    /// @notice On-chain data of a badge.
    function getBadge(uint256 tokenId) external view returns (Badge memory) {
        if (_ownerOf(tokenId) == address(0)) revert BadgeDoesNotExist(tokenId);
        return _badges[tokenId];
    }

    /// @notice Token ids held by `owner`, ascending.
    /// @dev O(totalMinted); intended for off-chain calls.
    function getBadgesByOwner(address owner) external view returns (uint256[] memory tokenIds) {
        uint256 balance = balanceOf(owner);
        tokenIds = new uint256[](balance);
        if (balance == 0) return tokenIds;

        uint256 found;
        uint256 last = _nextTokenId; // exclusive
        for (uint256 id = 1; id < last && found < balance; ++id) {
            if (_ownerOf(id) == owner) {
                tokenIds[found++] = id;
            }
        }
    }

    /// @notice Total badges minted.
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
