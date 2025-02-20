const { ethers } = require("hardhat");
const { PinataSDK } = require("pinata-web3");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const SHEET_ID = "1JYD1__PHC1velq0C8EqhlGKENs1b9QuIVfazHz2QAuQ";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: "ivory-immense-otter-61.mypinata.cloud",
});

function extractID(googleDriveURL) {
    const regex = /[?&]id=([a-zA-Z0-9_-]+)/;
    const match = googleDriveURL.match(regex);
    return match ? match[1] : null;
}

async function uploadImageToPinata(imageURL) {
    try {
        const upload = await pinata.upload.url(imageURL);
        if (upload) {
            return `ipfs://${upload.IpfsHash}`;
        }
    } catch (error) {
        console.error("Error uploading image to Pinata:", error);
    }
    return null;
}

async function uploadMetadataToPinata(imageIPFS, identifier) {
    try {
        const metadata = {
            name: "W3B Pictionary",
            description: "Made with ❤️ by "+identifier,
            image: imageIPFS
        };

        fs.writeFileSync('metadata.json', JSON.stringify(metadata, null, 2));
        console.log("Metadata Saved (Locally)");

        const jsonUpload = await pinata.upload.json(metadata);
        if (jsonUpload) {
            return `ipfs://${jsonUpload.IpfsHash}`;
        }
    } catch (error) {
        console.error("Error uploading metadata to Pinata:", error);
    }
    return null;
}

async function main() {
    const results = []; 

    try {
        const response = await axios.get(SHEET_URL);
        const rows = response.data.split("\n").slice(1);

        let tokenId = -1;
        for (const row of rows) {

            let [_, walletAddress, googleDriveURL, identifier] = row.split(",");
            walletAddress = walletAddress.substring(1, walletAddress.length - 1);
            if (walletAddress && googleDriveURL) {
                const googleDriveID = extractID(googleDriveURL);
                if (!googleDriveID) {
                    console.error("Failed To Parse:", googleDriveURL);
                    continue;
                }

                const imageURL = `https://drive.google.com/uc?export=view&id=${googleDriveID}`;
                const imageIPFS = await uploadImageToPinata(imageURL);
                if (!imageIPFS) {
                    console.error("Failed To Upload Image:", imageURL);
                    continue;
                }

                const tokenURI = await uploadMetadataToPinata(imageIPFS, identifier);
                if (!tokenURI) {
                    console.error("Failed To Upload Metadata:", imageURL);
                    continue;
                }

                console.log(`Wallet Address: ${walletAddress}`);
                console.log(`Token URI: ${tokenURI}`);

                const status = await mintNFT(walletAddress, tokenURI);
                if (status) {
                    tokenId++; 
                }

                results.push({ identifier, walletAddress, tokenId: tokenId });
            }
        }

        writeCSV(results);
    } catch (error) {
        console.error("Error:", error);
    }
}

function getABI() {
    try {
        const dir = path.resolve(__dirname, "./artifacts/contracts/PictionaryNFT.sol/PictionaryNFT.json");
        const file = fs.readFileSync(dir, "utf8");
        return JSON.parse(file).abi;
    } catch (e) {
        console.error("Error loading ABI:", e);
    }
}

async function mintNFT(walletAddress, tokenURI) {
    console.log(`Minting NFT for ${walletAddress} with tokenURI: ${tokenURI}`);
    try {
        const [deployer] = await ethers.getSigners();
        const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
        const contract = new ethers.Contract(deployments.contractAddress, getABI(), deployer);
        await contract.mintNFT(walletAddress, tokenURI);
        console.log("NFT Minted!");
        return true;
    } catch (error) {
        console.error("Error minting NFT:", error);
        return false;
    }
}

function writeCSV(data) {
    const header = "Identifier,Wallet Address,Token ID\n";
    const rows = data.map(item => `${item.identifier},${item.walletAddress},${item.tokenId}`).join("\n");

    const csvContent = header + rows;
    fs.writeFileSync('output.csv', csvContent, "utf8");
    console.log("Written To output.csv");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
