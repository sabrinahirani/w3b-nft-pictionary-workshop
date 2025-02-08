const { ethers } = require("hardhat");
const { PinataSDK } = require("pinata-web3");

const axios = require("axios");
const fs = require("fs")
const path = require("path")

require('dotenv').config();

const SHEET_ID = "1JYD1__PHC1velq0C8EqhlGKENs1b9QuIVfazHz2QAuQ";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

function extractID(googleDriveURL) {
    const regex = /[?&]id=([a-zA-Z0-9_-]+)/;
    const match = googleDriveURL.match(regex);
    
    if (match && match[1]) {
        return match[1];
    }
    return null;
}

async function uploadImageToPinata(imageURL) {
    const pinata = new PinataSDK({
            pinataJwt: process.env.PINATA_JWT,
            pinataGateway: "ivory-immense-otter-61.mypinata.cloud",
          });
          
          const upload = await pinata.upload.url(imageURL);
          if (upload) {
            return "ipfs://"+upload.IpfsHash;
          }
          return null;
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
                };

                const imageURL = `https://drive.google.com/uc?export=view&id=${googleDriveID}`;
                
                const ipfsURL = await uploadImageToPinata(imageURL);
                if (!ipfsURL) {
                    console.error("Failed To Upload:", imageURL);
                    continue;
                }

                console.log(`Wallet Address: ${walletAddress}`);
                console.log(`Image URL: ${ipfsURL}`);

                await mintNFT(walletAddress, ipfsURL);
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// swiped from ethereum stack overflow
const getABI = () => {
  try {
    const dir = path.resolve(
      __dirname,
      "./artifacts/contracts/PictionaryNFT.sol/PictionaryNFT.json"
    )
    const file = fs.readFileSync(dir, "utf8")
    const json = JSON.parse(file)
    const abi = json.abi
    return abi
  } catch (e) {
    console.log(`e`, e)
  }
}

// TODO disaster
async function mintNFT(walletAddress, imageURL) {
    console.log(`Minting NFT for ${walletAddress} (with ${imageURL})`);

    try {

        // const provider = new ethers.JsonRpcProvider(process.env.INFURA_SEPOLIA_BASE_URL);
        // const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        const [deployer] = await ethers.getSigners();

        const deployments = JSON.parse(fs.readFileSync('deployments.json', 'utf8'));
        const contractAddress = deployments.contractAddress
        const contractABI = getABI();

        const contract = new ethers.Contract(contractAddress, contractABI, deployer);

        // TODO remove hardcoding (should be walletAddress)
        await contract.mintNFT('0x13348abDEF24dC1D934c9f86e75777dE978E62BB', imageURL);

        console.log(`NFT Minted!`);
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
