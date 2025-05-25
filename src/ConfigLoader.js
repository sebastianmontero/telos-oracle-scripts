const { z } = require('zod');
require('dotenv').config();

// Helper for EOSIO account name (can be reused)
const isEosioAccountName = (name) => {
    if (typeof name !== 'string') return false;
    const regex = /^[a-z1-5.]{1,12}$/;
    const regexLong = /^[a-z1-5]{1,12}[.][a-z1-5]{1,12}$/;
    if (name === 'eosio') return true;
    // Standard account name (up to 12 chars, or 13 with a single dot not at start/end)
    if (name.length <= 12) return regex.test(name);
    if (name.length === 13 && name.includes('.') && !name.startsWith('.') && !name.endsWith('.')) {
        return regexLong.test(name);
    }
    return false;
};

const isEosioPrivateKey = (key) => typeof key === 'string' && key.startsWith('5') && key.length === 51;

// Custom Zod types/refinements
const ZodUrlString = z.string().url({ message: "Invalid URL" });
const ZodUrlArray = z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? val.split(',').map(s => s.trim()).filter(s => s.length > 0) : []),
    z.array(ZodUrlString).min(1, { message: "Must be a non-empty list of URLs" })
);
const ZodEosioAccountName = z.string().refine(isEosioAccountName, { message: "Invalid EOSIO account name format" });
const ZodEosioPrivateKey = z.string().refine(isEosioPrivateKey, { message: "Invalid EOSIO private key format" });
const ZodBoolean = z.preprocess(
    (val) => {
        const sVal = String(val).toLowerCase().trim();
        if (sVal === 'true') return true;
        if (sVal === 'false') return false;
        return val; // Let Zod's boolean validator handle other cases
    },
    z.boolean({invalid_type_error: 'Expected "true" or "false"'})
);
const ZodPositiveInteger = z.coerce.number().int({ message: "Must be an integer" }).positive({ message: "Must be a positive integer" });


const envSchema = z.object({
    ANTELOPE_RPC: ZodUrlArray,
    ANTELOPE_HYPERION: ZodUrlArray,
    SCRIPTS_LISTENERS_CONSOLE_LOG: ZodBoolean.optional().default(false),
    // SCRIPTS_LISTENERS_MAX_BLOCK_DIFF removed
    SCRIPTS_LISTENERS_CHECK_INTERVAL_MS: ZodPositiveInteger,
    SCRIPTS_LISTENERS_TRX_BATCH_SIZE: ZodPositiveInteger,
    SCRIPTS_LISTENERS_HEARTBEAT_INTERVAL_SECONDS: ZodPositiveInteger,
    SCRIPTS_LISTENERS_MISSED_HEARTBEATS_FOR_RESTART: ZodPositiveInteger, // New
    SCRIPTS_LISTENERS_MAX_BLOCKS_BEHIND: ZodPositiveInteger,          // New
    SCRIPTS_LISTENERS_RNG_CALLER_NAME: ZodEosioAccountName,
    SCRIPTS_LISTENERS_RNG_CALLER_PERMISSION: ZodEosioAccountName, // Assuming same validation as account name
    SCRIPTS_LISTENERS_RNG_CALLER_PRIVATE_KEY: ZodEosioPrivateKey,
    SCRIPTS_LISTENERS_RNG_CALLER_SIGNING_KEY: ZodEosioPrivateKey,
    SCRIPTS_LISTENERS_RNG_ACCOUNT: ZodEosioAccountName,
    SCRIPTS_LISTENERS_RNG_REQUEST_ACTIVE: ZodBoolean,
    SCRIPTS_LISTENERS_RNG_REQUEST_CHECK_INTERVAL_MS: ZodPositiveInteger,
});

class ConfigLoader {
    #config;

    constructor() {
        try {
            const parsedEnv = envSchema.parse(process.env);

            // Now structure it as per your original paths
            this.#config = {
                antelope: {
                    rpc: parsedEnv.ANTELOPE_RPC,
                    hyperion: parsedEnv.ANTELOPE_HYPERION,
                },
                scripts: {
                    listeners: {
                        console_log: parsedEnv.SCRIPTS_LISTENERS_CONSOLE_LOG,
                        // max_block_diff removed
                        check_interval_ms: parsedEnv.SCRIPTS_LISTENERS_CHECK_INTERVAL_MS,
                        trx_batch_size: parsedEnv.SCRIPTS_LISTENERS_TRX_BATCH_SIZE,
                        heartbeat_interval_seconds: parsedEnv.SCRIPTS_LISTENERS_HEARTBEAT_INTERVAL_SECONDS,
                        missed_heartbeats_for_restart: parsedEnv.SCRIPTS_LISTENERS_MISSED_HEARTBEATS_FOR_RESTART, // New
                        max_blocks_behind: parsedEnv.SCRIPTS_LISTENERS_MAX_BLOCKS_BEHIND,                      // New
                        rng: {
                            caller: {
                                name: parsedEnv.SCRIPTS_LISTENERS_RNG_CALLER_NAME,
                                permission: parsedEnv.SCRIPTS_LISTENERS_RNG_CALLER_PERMISSION,
                                private_key: parsedEnv.SCRIPTS_LISTENERS_RNG_CALLER_PRIVATE_KEY,
                                signing_key: parsedEnv.SCRIPTS_LISTENERS_RNG_CALLER_SIGNING_KEY,
                            },
                            account: parsedEnv.SCRIPTS_LISTENERS_RNG_ACCOUNT,
                            request: {
                                active: parsedEnv.SCRIPTS_LISTENERS_RNG_REQUEST_ACTIVE,
                                check_interval_ms: parsedEnv.SCRIPTS_LISTENERS_RNG_REQUEST_CHECK_INTERVAL_MS,
                            },
                        },
                    },
                },
            };
            // Deep freeze the config object to make it truly immutable
            const deepFreeze = (obj) => {
                Object.keys(obj).forEach(prop => {
                    if (obj[prop] !== null && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') && !Object.isFrozen(obj[prop])) {
                        deepFreeze(obj[prop]);
                    }
                });
                return Object.freeze(obj);
            };
            deepFreeze(this.#config);

        } catch (error) {
            if (error instanceof z.ZodError) {
                const issues = error.errors.map(e => {
                    const envVarName = e.path[0]; // Assuming top-level keys are env var names
                    const receivedValue = process.env[envVarName];
                    return `${e.path.join('.') || 'Value'}: ${e.message} (Received for ${envVarName}: ${JSON.stringify(receivedValue)})`;
                }).join('\n');
                throw new Error(`Environment variable validation failed:\n${issues}`);
            }
            throw error;
        }
    }

    getConfig() {
        return this.#config;
    }
}

module.exports = ConfigLoader;