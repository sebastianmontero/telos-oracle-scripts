require('dotenv').config()
class ConfigLoader {
    #config;
    #schema = {
        ANTELOPE_RPC: {
            path: ['antelope', 'rpc'],
            type: 'string[]',
            required: true,
            validator: (value) => {
                if (!Array.isArray(value) || value.length === 0) {
                    return 'ANTELOPE_RPC must be a non-empty list of URLs.';
                }
                if (!value.every(this.#isValidUrl)) {
                    return 'Invalid URL found in ANTELOPE_RPC.';
                }
                return true;
            },
        },
        ANTELOPE_HYPERION: {
            path: ['antelope', 'hyperion'],
            type: 'string[]',
            required: true,
            validator: (value) => {
                if (!Array.isArray(value) || value.length === 0) {
                    return 'ANTELOPE_HYPERION must be a non-empty list of URLs.';
                }
                if (!value.every(this.#isValidUrl)) {
                    return 'Invalid URL found in ANTELOPE_HYPERION.';
                }
                return true;
            },
        },
        SCRIPTS_LISTENERS_CONSOLE_LOG: {
            path: ['scripts', 'listeners', 'console_log'],
            type: 'boolean',
            // Not strictly required, app can default to false if undefined
        },
        SCRIPTS_LISTENERS_MAX_BLOCK_DIFF: {
            path: ['scripts', 'listeners', 'max_block_diff'],
            type: 'number',
            required: true,
            validator: (value) => (Number.isInteger(value) && value >= 0) || 'Must be a non-negative integer',
        },
        SCRIPTS_LISTENERS_CHECK_INTERVAL_MS: {
            path: ['scripts', 'listeners', 'check_interval_ms'],
            type: 'number',
            required: true,
            validator: (value) => (Number.isInteger(value) && value > 0) || 'Must be a positive integer',
        },
        SCRIPTS_LISTENERS_TRX_BATCH_SIZE: {
            path: ['scripts', 'listeners', 'trx_batch_size'],
            type: 'number',
            required: true,
            validator: (value) => (Number.isInteger(value) && value > 0) || 'Must be a positive integer',
        },
        SCRIPTS_LISTENERS_HEARTBEAT_INTERVAL_SECONDS: {
            path: ['scripts', 'listeners', 'heartbeat_interval_seconds'],
            type: 'number',
            required: true,
            validator: (value) => (Number.isInteger(value) && value > 0) || 'Must be a positive integer',
        },
        SCRIPTS_LISTENERS_RNG_CALLER_NAME: {
            path: ['scripts', 'listeners', 'rng', 'caller', 'name'],
            type: 'string',
            required: true,
            validator: (value) => this.#isEosioAccountName(value) || 'Invalid EOSIO account name format',
        },
        SCRIPTS_LISTENERS_RNG_CALLER_PERMISSION: {
            path: ['scripts', 'listeners', 'rng', 'caller', 'permission'],
            type: 'string',
            required: true,
            validator: (value) => this.#isEosioAccountName(value) || 'Invalid EOSIO permission name format',
        },
        SCRIPTS_LISTENERS_RNG_CALLER_PRIVATE_KEY: {
            path: ['scripts', 'listeners', 'rng', 'caller', 'private_key'],
            type: 'string',
            required: true,
            validator: (value) => this.#isEosioPrivateKey(value) || 'Invalid EOSIO private key format',
        },
        SCRIPTS_LISTENERS_RNG_CALLER_SIGNING_KEY: {
            path: ['scripts', 'listeners', 'rng', 'caller', 'signing_key'],
            type: 'string',
            required: true,
            validator: (value) => this.#isEosioPrivateKey(value) || 'Invalid EOSIO private key format',
        },
        SCRIPTS_LISTENERS_RNG_ACCOUNT: {
            path: ['scripts', 'listeners', 'rng', 'account'],
            type: 'string',
            required: true,
            validator: (value) => this.#isEosioAccountName(value) || 'Invalid EOSIO account name format',
        },
        SCRIPTS_LISTENERS_RNG_REQUEST_ACTIVE: {
            path: ['scripts', 'listeners', 'rng', 'request', 'active'],
            type: 'boolean',
            required: true, // Application logic likely depends on this being explicitly true/false
        },
        SCRIPTS_LISTENERS_RNG_REQUEST_CHECK_INTERVAL_MS: {
            path: ['scripts', 'listeners', 'rng', 'request', 'check_interval_ms'],
            type: 'number',
            required: true,
            validator: (value) => (Number.isInteger(value) && value > 0) || 'Must be a positive integer',
        },
    };

    constructor() {
        this.#config = {};
        this.#loadAndValidate();
        Object.freeze(this.#config);
    }

    getConfig() {
        return this.#config;
    }

    #loadAndValidate() {
        for (const envVarName in this.#schema) {
            const item = this.#schema[envVarName];
            const envValue = process.env[envVarName];
            let parsedValue;

            if (envValue === undefined) {
                if (item.required) {
                    throw new Error(`Missing required environment variable: ${envVarName}`);
                }
                // For non-required, non-set variables, parsedValue remains undefined.
                // This will result in the key having 'undefined' as its value in the config.
                parsedValue = undefined;
            } else {
                // If env var is set (even to empty string), try to parse it.
                // #parseValue will throw if it's an invalid format for the type.
                parsedValue = this.#parseValue(envValue, item.type, envVarName);
            }

            // Run validator if it exists.
            // For required fields, parsedValue will be defined here (or an error thrown above).
            // For non-required fields that were set, parsedValue will be the parsed value.
            // For non-required fields that were NOT set, parsedValue is undefined;
            //   validators should generally not run on undefined unless designed for it.
            //   Our current validators assume a value is present.
            if (item.validator) {
                 // If parsedValue is undefined (for a non-required field that wasn't set),
                 // we typically don't validate. However, if a field is required,
                 // parsedValue will not be undefined at this point.
                 // The validators for RPC/Hyperion expect an array, even if empty initially from parseValue.
                if (parsedValue !== undefined || item.type === 'string[]') { // Special handling for string[] which can be []
                    const validationResult = item.validator(parsedValue);
                    if (typeof validationResult === 'string') {
                        throw new Error(`Validation failed for ${envVarName}: ${validationResult}. Value: ${JSON.stringify(parsedValue)}`);
                    }
                }
            }
            this.#setValueByPath(this.#config, item.path, parsedValue);
        }
    }

    #parseValue(valueStr, type, envVarName) {
        // valueStr is guaranteed to be a string here, as it comes from process.env
        const strVal = String(valueStr).trim();

        switch (type) {
            case 'string':
                return strVal;
            case 'boolean':
                if (strVal.toLowerCase() === 'true') return true;
                if (strVal.toLowerCase() === 'false') return false;
                throw new Error(`Invalid boolean value for ${envVarName}: "${strVal}". Expected "true" or "false".`);
            case 'number':
                // Handle empty string explicitly for numbers if it should be invalid
                if (strVal === "") {
                    throw new Error(`Invalid number value for ${envVarName}: received an empty string.`);
                }
                const num = Number(strVal);
                if (isNaN(num)) {
                    throw new Error(`Invalid number value for ${envVarName}: "${strVal}".`);
                }
                return num;
            case 'string[]':
                if (strVal === "") return []; // An empty env var for an array results in an empty array
                return strVal.split(',').map(s => s.trim()).filter(s => s.length > 0);
            default:
                throw new Error(`Unknown type "${type}" for ${envVarName}`);
        }
    }

    #setValueByPath(obj, path, value) {
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        current[path[path.length - 1]] = value;
    }

    #isValidUrl(urlString) {
        if (typeof urlString !== 'string' || urlString.trim() === '') return false;
        try {
            new URL(urlString);
            return true;
        } catch (e) {
            return false;
        }
    }

    #isEosioAccountName(name) {
        if (typeof name !== 'string') return false;
        const regex = /^[a-z1-5.]{1,12}$/;
        const regexLong = /^[a-z1-5]{1,12}[.][a-z1-5]{1,12}$/;
        if (name === 'eosio') return true;
        return regex.test(name) || (name.length === 13 && name.includes('.') && !name.startsWith('.') && !name.endsWith('.') && regexLong.test(name));
    }

    #isEosioPrivateKey(key) {
        return typeof key === 'string' && key.startsWith('5') && key.length === 51;
    }
}

module.exports = ConfigLoader;
