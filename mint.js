const { ethers } = require("hardhat");
const { PinataSDK } = require("pinata-web3");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const SHEET_ID = "1JYD1__PHC1velq0C8EqhlGKENs1b9QuIVfazHz2QAuQ";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

const { NFTStorage, File } = require("nft.storage");

function extractID(googleDriveURL) {
    const regex = /[?&]id=([a-zA-Z0-9_-]+)/;
    const match = googleDriveURL.match(regex);
    return match ? match[1] : null;
}

async function uploadToNFTStorage(imageURL, name, description) {
    try {
        const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });
        
        const imageResponse = await axios.get(imageURL, { responseType: "arraybuffer" });
        const imageBuffer = Buffer.from(imageResponse.data);
        const imageFile = new File([imageBuffer], "nft.jpg", { type: "image/jpeg" });
        
        const metadata = await client.store({
            name,
            description,
            image: imageFile
        });
        
        return metadata.url; // Returns the metadata JSON URL (ipfs:// format)
    } catch (error) {
        console.error("Error uploading to NFT.storage:", error);
        return null;
    }
}

async function main() {
    try {
        const response = await axios.get(SHEET_URL);
        const rows = response.data.split("\n").slice(1);

        for (const row of rows) {
            const [_, walletAddress, googleDriveURL] = row.split(",");
            if (walletAddress && googleDriveURL) {
                const googleDriveID = extractID(googleDriveURL);
                if (!googleDriveID) {
                    console.error("Failed To Parse:", googleDriveURL);
                    continue;
                }
                
                const imageURL = `https://drive.google.com/uc?export=view&id=${googleDriveID}`;
                const tokenURI = await uploadToNFTStorage(imageURL, "W3B Pictionary Item", "We love pictionary");
                if (!tokenURI) {
                    console.error("Failed To Upload Metadata:", imageURL);
                    continue;
                }
                
                console.log(`Wallet Address: ${walletAddress}`);
                console.log(`Token URI: ${tokenURI}`);
                await mintNFT(walletAddress, tokenURI);
            }
        }
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
    } catch (error) {
        console.error("Error minting NFT:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
