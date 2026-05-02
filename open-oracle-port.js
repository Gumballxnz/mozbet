const common = require("oci-common");
const core = require("oci-core");
const fs = require("fs");
const path = require("path");

// Carregar variáveis de ambiente manualmente ou usar um parser básico de dotenv
const envPath = path.join(__dirname, ".env_oracle");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith("#")) return;
    const parts = cleanLine.split("=");
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
});

console.log("Variáveis de ambiente lidas:", JSON.stringify(env, null, 2));
console.log("Subnet ID carregado:", env.SNIPER_SUBNET);

// A chave PEM contém uma linha extra no fim no ficheiro do utilizador, vamos limpá-la se existir
let privateKey = fs.readFileSync(path.join(__dirname, "ghostgumball39@gmail.com-2026-04-20T00_26_48.182Z.pem"), "utf8");
privateKey = privateKey.replace("OCI_API_KEY", "").trim();

const provider = new common.SimpleAuthenticationDetailsProvider(
    env.OCI_TENANCY_OCID,
    env.OCI_USER_OCID,
    env.OCI_FINGERPRINT,
    privateKey,
    null,
    common.Region.CA_MONTREAL_1
);

const vcnClient = new core.VirtualNetworkClient({ authenticationDetailsProvider: provider });

async function openPort() {
    try {
        console.log("Conectando à Oracle Cloud...");
        
        // 1. Encontrar a subnet e VCN associada
        const getSubnetRequest = { subnetId: env.SNIPER_SUBNET };
        const subnetResponse = await vcnClient.getSubnet(getSubnetRequest);
        const securityListIds = subnetResponse.subnet.securityListIds;

        if (!securityListIds || securityListIds.length === 0) {
            throw new Error("Nenhuma Security List encontrada na subnet.");
        }

        // Vamos usar a primeira (geralmente a default)
        const securityListId = securityListIds[0];
        console.log(`Modificando a Security List: ${securityListId}`);

        const getSlReq = { securityListId };
        const slResp = await vcnClient.getSecurityList(getSlReq);
        const currentIngressRules = slResp.securityList.ingressSecurityRules;

        // Verificar se a regra já existe para a porta 3001
        const ruleExists = currentIngressRules.some(rule => 
            rule.tcpOptions && 
            rule.tcpOptions.destinationPortRange && 
            rule.tcpOptions.destinationPortRange.max === 3001 &&
            rule.tcpOptions.destinationPortRange.min === 3001
        );

        if (ruleExists) {
            console.log("✅ A porta 3001 já está aberta na Oracle Cloud!");
            return;
        }

        console.log("Adicionando regra para a porta 3001...");
        const newRule = {
            protocol: "6", // TCP
            source: "0.0.0.0/0",
            sourceType: "CIDR_BLOCK",
            tcpOptions: {
                destinationPortRange: {
                    max: 3001,
                    min: 3001
                }
            },
            description: "Socket.io Realtime"
        };

        const updatedRules = [...currentIngressRules, newRule];

        const updateReq = {
            securityListId,
            updateSecurityListDetails: {
                ingressSecurityRules: updatedRules
            }
        };

        await vcnClient.updateSecurityList(updateReq);
        console.log("✅ Porta 3001 aberta com sucesso na Oracle Cloud via API!");

    } catch (error) {
        console.error("❌ Erro ao abrir porta:", error.message);
        if(error.serviceDetails) {
             console.error("Detalhes da API:", error.serviceDetails);
        }
    }
}

openPort();
