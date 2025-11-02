import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ethers } from "ethers";

// ENS Configuration (Mainnet)
const ENS_REGISTRAR_MAINNET = process.env.NEXT_PUBLIC_ENS_REGISTRAR_MAINNET;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const ALCHEMY_MAINNET_API_KEY = process.env.ALCHEMY_MAINNET_API_KEY;
const ENS_PARENT_NAME = process.env.ENS_PARENT_NAME || "liquifidev.eth";

// Mainnet RPC URL
const MAINNET_RPC_URL = ALCHEMY_MAINNET_API_KEY
  ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_MAINNET_API_KEY}`
  : null;

/**
 * Validate ENS label format
 */
function validateENSLabel(label: string): { valid: boolean; error?: string } {
  if (!label) {
    return { valid: false, error: "El nombre de usuario es requerido" };
  }
  
  if (label.length < 3) {
    return { valid: false, error: "El nombre debe tener al menos 3 caracteres" };
  }
  
  if (label.length > 50) {
    return { valid: false, error: "El nombre no puede exceder 50 caracteres" };
  }
  
  if (!/^[a-z0-9-]+$/.test(label)) {
    return { valid: false, error: "Solo se permiten letras minúsculas, números y guiones" };
  }
  
  if (label.startsWith("-") || label.endsWith("-")) {
    return { valid: false, error: "El nombre no puede empezar o terminar con guión" };
  }
  
  if (label.includes("--")) {
    return { valid: false, error: "No se permiten guiones consecutivos" };
  }
  
  return { valid: true };
}

// ENSSubnameRegistrar ABI (only what we need)
const ENS_REGISTRAR_ABI = [
  "function registerOrg(string memory ensLabel, address owner) external",
  "function isAuthorized(string memory ensLabel, address wallet) external view returns (bool)",
  "event OrgRegistered(string indexed ensLabel, address indexed owner, bytes32 indexed node)",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { org_id, ens_label, owner_address } = body;

    if (!org_id) {
      return NextResponse.json(
        { error: "org_id is required" },
        { status: 400 }
      );
    }

    // Check if org already has ENS registered
    const { data: existingKyb } = await supabase
      .from("kyb_results")
      .select("*")
      .eq("org_id", org_id)
      .single();

    // If already registered and has ENS, just return existing data
    if (existingKyb?.ens_registered && existingKyb?.ens_label) {
      return NextResponse.json({
        org_id: existingKyb.org_id,
        score: existingKyb.score,
        status: existingKyb.status,
        ens_label: existingKyb.ens_label,
        full_domain: `${existingKyb.ens_label}.${ENS_PARENT_NAME}`,
        ens_registered: true,
      });
    }

    // Mock KYB: random score between 80-100
    const kybScore = Math.floor(Math.random() * 21) + 80; // 80-100
    const kybStatus = kybScore >= 85 ? "approved" : "pending";

    let ensRegistered = false;
    let ensLabel: string | null = null;
    let txHash: string | null = null;

    // If KYB approved and ens_label provided, register ENS subdomain
    if (kybStatus === "approved" && ens_label && owner_address && !existingKyb?.ens_registered) {
      // Normalize and validate label
      const normalizedLabel = ens_label.toLowerCase().trim();
      const validation = validateENSLabel(normalizedLabel);
      
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Check if label is already taken
      const { data: existingLabel } = await supabase
        .from("kyb_results")
        .select("ens_label")
        .eq("ens_label", normalizedLabel)
        .single();

      if (existingLabel) {
        return NextResponse.json(
          { error: "Este nombre de usuario ya está registrado" },
          { status: 400 }
        );
      }

      // Validate environment variables
      if (!ENS_REGISTRAR_MAINNET || ENS_REGISTRAR_MAINNET === "0x0000000000000000000000000000000000000000") {
        console.warn("⚠️ ENS_REGISTRAR_MAINNET not configured, skipping ENS registration");
      } else if (!DEPLOYER_PRIVATE_KEY || !MAINNET_RPC_URL) {
        console.warn("⚠️ Missing DEPLOYER_PRIVATE_KEY or ALCHEMY_MAINNET_API_KEY, skipping ENS registration");
      } else {
        // Register ENS subdomain on Mainnet
        // NOTE: Calling NameWrapper directly since the contract approach has permission issues
        try {
          console.log(`📝 Registering ENS subdomain: ${normalizedLabel}.${ENS_PARENT_NAME}`);
          console.log(`   Owner address: ${owner_address}`);
          
          const provider = new ethers.JsonRpcProvider(MAINNET_RPC_URL);
          // DEPLOYER_PRIVATE_KEY is validated above, safe to use
          const deployerKey = DEPLOYER_PRIVATE_KEY as string;
          const signer = new ethers.Wallet(deployerKey, provider);

          // Validate owner address
          if (!ethers.isAddress(owner_address)) {
            return NextResponse.json(
              { error: "Invalid owner_address" },
              { status: 400 }
            );
          }

          // Calculate parent node (should match what's in the contract)
          // For liquifidev.eth: 0x70390e6020cabea5ca2eede70a174f6a92df62734139fbdf68d542511f79ccaa
          const PARENT_NODE = process.env.ENS_PARENT_NODE || "0x70390e6020cabea5ca2eede70a174f6a92df62734139fbdf68d542511f79ccaa";
          
          // Calculate label hash
          const labelHash = ethers.keccak256(ethers.toUtf8Bytes(normalizedLabel));
          
          // NameWrapper address and ABI
          const NAME_WRAPPER = "0x0635513f179D50A207757E05759CbD106d7dFcE8";
          const PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";
          
          const nameWrapperABI = [
            "function setSubnodeRecord(bytes32 parentNode, bytes32 label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry) external returns (bytes32 node)"
          ];
          
          const nameWrapper = new ethers.Contract(NAME_WRAPPER, nameWrapperABI, signer);
          
          console.log(`   Calling NameWrapper directly from wallet owner`);
          console.log(`   Parent node: ${PARENT_NODE}`);
          console.log(`   Label hash: ${labelHash}`);

          // Register subdomain directly via NameWrapper
          const tx = await nameWrapper.setSubnodeRecord(
            PARENT_NODE,
            labelHash,
            owner_address,
            PUBLIC_RESOLVER,
            0, // ttl
            0, // fuses
            0  // expiry
          );
          
          console.log(`⏳ Transaction sent: ${tx.hash}`);
          
          // Wait for confirmation
          const receipt = await tx.wait();
          console.log(`✅ ENS subdomain registered! TX: ${receipt.hash}`);
          
          ensRegistered = true;
          ensLabel = normalizedLabel;
          txHash = receipt.hash;

          // Also register in the ENSSubnameRegistrar contract for tracking (non-blocking)
          try {
            const registrar = new ethers.Contract(
              ENS_REGISTRAR_MAINNET,
              ["function registerOrg(string memory ensLabel, address owner) external"],
              signer
            );
            // Try to register in contract (may fail but we don't care, subdomain is already created)
            await registrar.registerOrg(normalizedLabel, owner_address).catch(() => {
              console.log("   Note: Could not register in ENSSubnameRegistrar contract (subdomain created anyway)");
            });
          } catch (contractErr) {
            // Ignore - subdomain is already created via NameWrapper
          }

          // Save to ens_registrations table
          await supabase.from("ens_registrations").insert({
            org_id,
            ens_label: normalizedLabel,
            full_domain: `${normalizedLabel}.${ENS_PARENT_NAME}`,
            owner_address,
            tx_hash: receipt.hash,
          });
        } catch (ensError: any) {
          console.error("❌ Error registering ENS subdomain:", ensError);
          console.error("   Error code:", ensError.code);
          console.error("   Error message:", ensError.message);
          console.error("   Error data:", ensError.data);
          
          // Check if it's a known error we should return
          if (ensError.message?.includes("AlreadyRegistered") || ensError.message?.includes("already registered")) {
            return NextResponse.json(
              { error: "Este nombre de usuario ya está registrado" },
              { status: 400 }
            );
          }
          if (ensError.message?.includes("NotOrgOwner") || ensError.message?.includes("not owner")) {
            return NextResponse.json(
              { error: "No tienes permisos para crear subdominios. Verifica que liquifidev.eth está wrapped y tu wallet es el owner." },
              { status: 400 }
            );
          }
          if (ensError.code === "CALL_EXCEPTION" || ensError.code === "UNPREDICTABLE_GAS_LIMIT") {
            return NextResponse.json(
              { 
                error: "Error al registrar subdominio ENS",
                details: "El contrato no pudo ejecutar la transacción. Verifica que liquifidev.eth está wrapped y el deployer tiene permisos.",
                hint: "Ve a https://app.ens.domains/ y verifica que liquifidev.eth está wrapped y tu wallet es el owner"
              },
              { status: 500 }
            );
          }
          
          // Log but don't fail KYB if ENS registration fails
          console.warn("⚠️ ENS registration failed, but KYB will still be saved");
        }
      }
    }

    // Upsert KYB result
    const kybData: any = {
      org_id,
      score: kybScore,
      status: kybStatus,
      updated_at: new Date().toISOString(),
    };

    // Only update ENS fields if we registered
    if (ensRegistered && ensLabel) {
      kybData.ens_label = ensLabel;
      kybData.ens_registered = true;
      kybData.ens_registered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("kyb_results")
      .upsert(kybData, {
        onConflict: "org_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save KYB result" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      org_id: data.org_id,
      score: data.score,
      status: data.status,
      ens_label: data.ens_label || null,
      full_domain: data.ens_label ? `${data.ens_label}.${ENS_PARENT_NAME}` : null,
      ens_registered: data.ens_registered || false,
      tx_hash: txHash,
    });
  } catch (error) {
    console.error("KYB error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

