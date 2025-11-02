#!/usr/bin/env node

/**
 * Script para encontrar direcciones de contratos desplegados
 * 
 * Este script busca direcciones de contratos en varios lugares:
 * 1. Variables de entorno locales (.env.local)
 * 2. Variables de entorno del sistema
 * 3. Sugiere buscar en Vercel, Arbiscan, o logs de deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Buscando direcciones de contratos desplegados...\n');

// Buscar en archivos .env locales
const envFiles = [
  '.env.local',
  '.env',
  'contracts/.env',
  'contracts/.env.local'
];

const addresses = {};

// Leer archivos .env si existen
envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`📄 Leyendo ${file}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach(line => {
      // Buscar variables de contrato
      if (line.includes('NEXT_PUBLIC_INFT_CONTRACT_ADDRESS')) {
        const match = line.match(/=(0x[a-fA-F0-9]{40})/);
        if (match) addresses.INFT = match[1];
      }
      if (line.includes('NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS')) {
        const match = line.match(/=(0x[a-fA-F0-9]{40})/);
        if (match) addresses.VAULT = match[1];
      }
      if (line.includes('NEXT_PUBLIC_LOAN_MANAGER_ADDRESS')) {
        const match = line.match(/=(0x[a-fA-F0-9]{40})/);
        if (match) addresses.LOAN_MANAGER = match[1];
      }
      if (line.includes('NEXT_PUBLIC_ENS_REGISTRAR_MAINNET')) {
        const match = line.match(/=(0x[a-fA-F0-9]{40})/);
        if (match) addresses.ENS_REGISTRAR = match[1];
      }
    });
  }
});

// Buscar en variables de entorno del sistema
const envVars = {
  INFT: process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS,
  VAULT: process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS,
  LOAN_MANAGER: process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS,
  ENS_REGISTRAR: process.env.NEXT_PUBLIC_ENS_REGISTRAR_MAINNET
};

Object.keys(envVars).forEach(key => {
  if (envVars[key] && envVars[key] !== '0x0000000000000000000000000000000000000000') {
    addresses[key] = envVars[key];
  }
});

// Mostrar resultados
console.log('\n📋 Direcciones encontradas:\n');

const contractNames = {
  INFT: 'LiquiFiINFT',
  VAULT: 'LiquidityVault',
  LOAN_MANAGER: 'LoanManager',
  ENS_REGISTRAR: 'ENSSubnameRegistrar'
};

let foundAny = false;

Object.keys(contractNames).forEach(key => {
  if (addresses[key]) {
    console.log(`✅ ${contractNames[key]}: ${addresses[key]}`);
    foundAny = true;
  } else {
    console.log(`❌ ${contractNames[key]}: No encontrado`);
  }
});

// Si no se encontraron todas, dar sugerencias
const missing = Object.keys(contractNames).filter(key => !addresses[key]);

if (missing.length > 0) {
  console.log('\n💡 Sugerencias para encontrar las direcciones faltantes:\n');
  
  console.log('1. 📦 Variables de Entorno (Vercel/Netlify/etc):');
  console.log('   - Revisa el dashboard de tu plataforma de deployment');
  console.log('   - Busca en Environment Variables\n');
  
  console.log('2. 🔍 Exploradores de Blockchain:');
  console.log('   Arbitrum Sepolia: https://sepolia.arbiscan.io/');
  console.log('   - Busca por el nombre del contrato');
  console.log('   - O busca transacciones desde tu wallet de deployment\n');
  
  console.log('3. 📝 Logs de Deployment:');
  console.log('   - Revisa el historial de tu terminal donde ejecutaste los scripts');
  console.log('   - Busca mensajes como "deployed to:" o "Deployment Summary"\n');
  
  console.log('4. 🗄️  Base de Datos Supabase:');
  console.log('   - Revisa si guardaste las direcciones en alguna tabla');
  console.log('   - Puede que estén en la tabla de invoices o loans\n');
  
  console.log('5. 🔑 Usando el Deployer Address:');
  console.log('   - Si tienes el address del deployer, puedes buscarlo en Arbiscan');
  console.log('   - Filtra por "Contract Creation" para ver todos los contratos que desplegaste\n');
}

// Generar formato para README
if (foundAny) {
  console.log('\n📝 Formato para README:\n');
  if (addresses.INFT) {
    console.log(`- **LiquiFiINFT** - \`${addresses.INFT}\` (Arbitrum Sepolia) - Tokeniza facturas como NFTs ERC-721.`);
  }
  if (addresses.VAULT) {
    console.log(`- **LiquidityVault** - \`${addresses.VAULT}\` (Arbitrum Sepolia) - Vault ERC-4626 que gestiona la liquidez del protocolo.`);
  }
  if (addresses.LOAN_MANAGER) {
    console.log(`- **LoanManager** - \`${addresses.LOAN_MANAGER}\` (Arbitrum Sepolia) - Gestiona préstamos con LTV del 70% usando NFTs como colateral.`);
  }
  if (addresses.ENS_REGISTRAR) {
    console.log(`- **ENSSubnameRegistrar** - \`${addresses.ENS_REGISTRAR}\` (Ethereum Mainnet) - Registra subdominios ENS para empresas verificadas.`);
  }
}

console.log('\n');

