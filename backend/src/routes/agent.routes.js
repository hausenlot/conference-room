import express from 'express';
import { AgentDispatchClient } from 'livekit-server-sdk';
import config from '../config/env.js';

const router = express.Router();

/**
 * LiveKitDispatcher
 * 
 * Wraps the livekit-server-sdk AgentDispatchClient to create
 * explicit agent dispatches. Logs all request/response data
 * for data-gathering purposes.
 */
export class LiveKitDispatcher {
    /**
     * @param {object} config
     * @param {string} config.url       - LiveKit server URL (wss://...)
     * @param {string} config.apiKey    - LiveKit API key
     * @param {string} config.apiSecret - LiveKit API secret
     */
    constructor(config) {
        this.config = config;
        this.client = new AgentDispatchClient(
            config.url,
            config.apiKey,
            config.apiSecret
        );

        console.log('\n[DISPATCHER] ✅ AgentDispatchClient initialized');
        console.log('[DISPATCHER]    URL:', config.url);
    }

    /**
     * Create an explicit dispatch to send an agent to a room.
     * @param {string} roomName  - Name of the room to dispatch to
     * @param {string} agentName - Name of the registered agent
     * @param {object} [metadata={}] - Optional metadata to attach
     * @returns {Promise<object>} The dispatch result
     */
    async createDispatch(roomName, agentName, metadata = {}) {
        console.log('\n[DISPATCHER] → Sending createDispatch');
        console.log('[DISPATCHER]    Room:', roomName);
        console.log('[DISPATCHER]    Agent:', agentName);
        console.log('[DISPATCHER]    Metadata:', JSON.stringify(metadata, null, 2));

        try {
            const metadataStr = JSON.stringify(metadata);
            // Agent name is test-agent. the metadata will be the identity the user used.
            const dispatch = await this.client.createDispatch(roomName, agentName, {
                metadata: metadataStr
            });

            console.log('[DISPATCHER] ✅ Dispatch created successfully');
            console.log('[DISPATCHER]    Dispatch result:', JSON.stringify(dispatch, null, 2));

            return dispatch;
        } catch (error) {
            console.error('[DISPATCHER] ❌ Dispatch error:', {
                message: error.message,
                code: error.code,
                status: error.status,
                body: error.body
            });

            if (error.message?.includes('no available')) {
                console.error('[DISPATCHER] ⚠️  No workers available! Check if your agent is connected.');
            }

            throw error;
        }
    }
}

// Initialize the dispatcher with system config
const dispatcher = new LiveKitDispatcher({
    url: config.livekitUrl,
    apiKey: config.livekitApiKey,
    apiSecret: config.livekitApiSecret
});

/**
 * POST /api/token
 * Body: { roomName, identity }
 * Spawns an agent in the specified room, passing the identity in the metadata.
 */
router.post('/token', async (req, res, next) => {
    try {
        const { roomName, identity, name } = req.body;

        if (!roomName || typeof roomName !== 'string' || !roomName.trim()) {
            res.status(400);
            throw new Error('roomName is required');
        }

        if (!identity || typeof identity !== 'string' || !identity.trim()) {
            res.status(400);
            throw new Error('identity is required');
        }

        const dispatch = await dispatcher.createDispatch(roomName, 'test-agent', {
            identity,
            name
        });

        return res.status(200).json({
            success: true,
            dispatch
        });
    } catch (error) {
        next(error);
    }
});

export default router;
