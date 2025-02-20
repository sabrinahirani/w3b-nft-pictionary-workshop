// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PictionaryNFT is ERC721URIStorage, Ownable {
    uint256 private _count = 0;

    constructor() ERC721("PictionaryNFT", "PICT") Ownable(msg.sender) {}

    function mintNFT(address recipient, string memory tokenURI) public onlyOwner {
        uint256 tokenId = _count;
        _count++;

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }
}
