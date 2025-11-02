# Aprobar Contrato ENSSubnameRegistrar

## Problema
El contrato `ENSSubnameRegistrar` necesita permisos para crear subdominios en tu nombre en NameWrapper.

## Solución

### Opción 1: Usar MetaMask (Más Fácil)

1. Ve a https://app.ens.domains/
2. Conecta tu wallet (`0xfc7E092616BF3Af9636B898C51d2C922b0e6DFf7`)
3. Busca `liquifidev.eth`
4. En la sección del dominio, busca "Permissions" o "Operators"
5. Agrega el contrato como operador: `0xa6EA99E4b6eEf5284823DB4A7ad2882480e4cd52`
6. Confirma la transacción

### Opción 2: Usar un Script (Programático)

Ejecuta este comando para aprobar el contrato:

```bash
cd contracts
node -e "
const { ethers } = require('ethers');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_MAINNET_API_KEY);
const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

const nameWrapper = '0x0635513f179D50A207757E05759CbD106d7dFcE8';
const registrarContract = '0xa6EA99E4b6eEf5284823DB4A7ad2882480e4cd52'; // ENSSubnameRegistrar

const nameWrapperABI = [
  'function setApprovalForAll(address operator, bool approved) external'
];

const nw = new ethers.Contract(nameWrapper, nameWrapperABI, signer);

console.log('Aprobando contrato...');
nw.setApprovalForAll(registrarContract, true)
  .then(tx => {
    console.log('TX enviada:', tx.hash);
    return tx.wait();
  })
  .then(receipt => {
    console.log('✅ Contrato aprobado! TX:', receipt.hash);
    console.log('Verifica en Etherscan: https://etherscan.io/tx/' + receipt.hash);
  })
  .catch(e => console.error('Error:', e.message));
"
```

## Verificación

Después de aprobar, verifica que funcionó:

```bash
cd contracts
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/gkuW9Fqbyb7-to0mEFOBf');

const nameWrapper = '0x0635513f179D50A207757E05759CbD106d7dFcE8';
const ownerWallet = '0xfc7E092616BF3Af9636B898C51d2C922b0e6DFf7';
const registrarContract = '0xa6EA99E4b6eEf5284823DB4A7ad2882480e4cd52';

const nameWrapperABI = ['function isApprovedForAll(address owner, address operator) external view returns (bool)'];
const nw = new ethers.Contract(nameWrapper, nameWrapperABI, provider);

nw.isApprovedForAll(ownerWallet, registrarContract)
  .then(approved => {
    console.log('Contrato aprobado?', approved);
    if (approved) {
      console.log('✅ Todo listo! El contrato puede crear subdominios ahora.');
    } else {
      console.log('❌ Aún no está aprobado. Ejecuta el script de aprobación.');
    }
  });
"
```

## Después de Aprobar

Una vez aprobado, el registro de subdominios debería funcionar correctamente cuando ejecutes KYB desde el frontend.

