const fs = require('fs');

async function main() {

    // const provider = new ethers.JsonRpcProvider(process.env.INFURA_SEPOLIA_BASE_URL);
    // const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const [deployer] = await ethers.getSigners();
    console.log('Deploying with ', deployer.address);
  
    const PictionaryNFT = await ethers.getContractFactory('PictionaryNFT');
    const contract = await PictionaryNFT.deploy();

    await contract.waitForDeployment();
  
    const contractAddress = await contract.getAddress();
    console.log("Contract Address:", contractAddress);

    const data = {
        deployer: deployer.address,
        contractAddress: contractAddress
    };

    fs.writeFileSync('deployments.json', JSON.stringify(data, null, 2));

    console.log('Saved to deployments.json');
}
  
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });