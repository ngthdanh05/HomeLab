// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ImpactBadge
/// @notice ERC-721 NFT "Proof of Action": chứng nhận các hành động tạo tác động tích cực.
/// @dev Chỉ địa chỉ có MINTER_ROLE mới được mint. Metadata nằm trên IPFS (ipfs://...).
///      tokenId bắt đầu từ 1 và tăng dần.
contract ImpactBadge is ERC721, ERC721URIStorage, AccessControl {
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

    /// @dev tokenId kế tiếp sẽ được mint (bắt đầu từ 1).
    uint256 private _nextTokenId = 1;

    /// @notice tokenId => thông tin badge lưu on-chain
    mapping(uint256 tokenId => Badge) private _badges;

    event BadgeMinted(address indexed to, uint256 tokenId, BadgeType badgeType);

    error EmptyMetadataURI();
    error BadgeDoesNotExist(uint256 tokenId);

    /// @param admin Địa chỉ nhận DEFAULT_ADMIN_ROLE và MINTER_ROLE ban đầu.
    constructor(address admin) ERC721("Impact Badge", "IMPACT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /// @notice Mint một badge mới cho `to`.
    /// @param to Người nhận badge.
    /// @param badgeType Loại badge.
    /// @param metadataURI IPFS URI của metadata (vd: ipfs://Qm...).
    /// @return tokenId ID của badge vừa mint.
    function mintBadge(address to, BadgeType badgeType, string calldata metadataURI)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256 tokenId)
    {
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();

        tokenId = _nextTokenId++;

        _badges[tokenId] = Badge({badgeType: badgeType, issuedAt: block.timestamp, recipient: to});

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit BadgeMinted(to, tokenId, badgeType);
    }


    /// @notice Lấy thông tin on-chain của một badge.
    function getBadge(uint256 tokenId) external view returns (Badge memory) {
        if (_ownerOf(tokenId) == address(0)) revert BadgeDoesNotExist(tokenId);
        return _badges[tokenId];
    }

    /// @notice Danh sách tokenId mà `owner` đang sở hữu (theo thứ tự tăng dần).
    /// @dev O(totalMinted) — dùng cho off-chain/view, không nên gọi trong giao dịch.
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

    /// @notice Tổng số badge đã mint.
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
